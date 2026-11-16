"""Offline review/publication artifact; no runtime writes or deployment."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app.shop_offers import CATALOG_PATH, ShopOfferCatalog, load_catalog  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['check', 'publish'])
    parser.add_argument('--catalog', type=Path, default=CATALOG_PATH)
    parser.add_argument('--against', type=Path, help='Preserved published baseline; defaults to checked-in catalog for publish')
    parser.add_argument('--assets', type=Path)
    parser.add_argument('--id')
    parser.add_argument('--revision', type=int)
    parser.add_argument('--at', help='Explicit UTC publication time')
    parser.add_argument('--output', type=Path, help='New reviewed artifact; never replaces input/baseline')
    args = parser.parse_args(argv)
    try:
        against = args.against or (CATALOG_PATH if args.command == 'publish' else None)
        previous = load_catalog(against, assets=args.assets) if against else None
        catalog = load_catalog(args.catalog, previous=previous, assets=args.assets)
        if args.command == 'publish':
            if not args.id or args.revision is None or not args.at or not args.output:
                parser.error('publish requires --id, --revision, --at and --output')
            if args.output.resolve() in {args.catalog.resolve(), against.resolve()}:
                raise ValueError('Publication output cannot replace its source or preserved baseline.')
            result = catalog.publish(args.id, args.revision, moment=args.at)
            # Check again against the independently retained published baseline.
            ShopOfferCatalog(result.document, previous=previous, assets=args.assets)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            with args.output.open('x', encoding='utf-8', newline='\n') as handle:
                json.dump(result.document, handle, ensure_ascii=False, indent=2)
                handle.write('\n')
            catalog = result
        print(json.dumps(dict(schema_version=1, offers=[
            {**{k: row[k] for k in ('id', 'revision', 'status', 'starts_at', 'ends_at', 'minimum_arena', 'price', 'guarantee', 'limit', 'content_hash')}, 'preview_count': len(row['targets'])}
            for row in catalog.document['offers']], runtime_changed=False, production_changed=False), ensure_ascii=False))
        return 0
    except (OSError, ValueError) as exc:
        print(json.dumps(dict(code=getattr(exc, 'code', 'catalog_review_failed'), error=str(exc)), ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
