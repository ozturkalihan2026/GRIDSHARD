# Authored shop cosmetics v1

Four separate native SVG sources; not generated from seasonal art or recolors.
Painted metal, broad bevels, upper-left light and dark navy match the existing
profile/dock family. No animation, font, external image, script or filter.

| Source | Cosmetic ID | Design ID | Geometry |
| --- | --- | --- | --- |
| dockyard_latch.svg | dockyard_latch_frame | dockyard_latch_frame_v1 | Two cast side clamps, one broad lower latch; transparent portrait aperture |
| dockyard_deck.svg | dockyard_deck_background | dockyard_deck_background_v1 | Stepped metal decks at both margins, quiet middle |
| workshop_shelf.svg | workshop_shelf_frame | workshop_shelf_frame_v1 | Offset rim with three thick short shelf projections; transparent aperture |
| workshop_bay.svg | workshop_bay_background | workshop_bay_background_v1 | Low corner workbench and two large copper coils; quiet middle |

Frames:128×128. Backgrounds:640×240. Catalog `look.asset` pins SHA256 to
these exact bytes. Update catalog hash and run `prepare_liveops_rewards.py sync`
after any reviewed source revision. Never edit already published reward art.
The web/mobile builder retains canonical paths and verifies their hashes in
addition to CSS media copies, so the server can validate the shipped catalog.

Pool `shop`, unassigned/locked; no price, release window or ownership grant.
See `docs/planning/shop-art-manifest.md` and the COS-03 acceptance record.
