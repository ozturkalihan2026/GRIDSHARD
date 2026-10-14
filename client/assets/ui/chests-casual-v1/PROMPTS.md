# Casual GRIDSHARD chests and opening states — 14 October 2026

Current selection, 15 October: the user rejected the simplified pilot and
selected the chamfered-corner family in `../chests-casual-v2/PROMPTS.md`.
This v1 is preserved for recovery and its notes below are historical.
The export-casual-chests.js helper now targets v2.

The user authorized placing the stylized pilot into the game with opening effects.
Closed masters are copied unchanged from qa_reports/chests-casual-pilot-20261014;
that README contains the exact closed-state edit prompts. Built-in Imagegen
produced one matching OPEN empty-chest state per closed target.
The realistic previous set is kept for recovery, not referenced at runtime.
Font/logo/dock and reward/purchase rules are outside this change.

Runtime: 256×256 closed shop/reward icons; 512×512 closed/open reveal images.
Twelve runtime WebP files total 2,061,266 bytes (~1.97 MiB); PNG masters and
the prior realistic chest set are excluded from the runtime build whitelist.
PNG masters remain unchanged. Technical resizing/encoding uses Sharp lossless
WebP and preserves alpha. App code adds the wait/unlock/burst/reward effects.
The open images contain no loot; actual rewards always come from server receipts.
Standard bronze/silver/gold/diamond appearances share these assets across shop,
inbox/season rewards and reveals. Custom tournament/league SVGs remain separate.
The reveal is a brief transition between closed/open illustrations, not skeletal
lid rigging. Reduced motion and low graphics use immediate states without particles.

## Opening-light revision v2 — 14 October 2026

The user rejected the original brief/obscured burst. Existing bitmap art is
unchanged: code-native effects now use bronze amber (255,150,55), silver ice blue
(149,210,255), gold yellow (255,205,51), and diamond cyan (80,235,255).
The 1.15-second unlock beat rattles the closed illustration, transitions to the
open illustration and settles. A 2.4-second tier-colored halo, upward ray fan,
inner-cavity light, rim shadow, expanding ring and colored sparks make the
opening visible. Halo/rays retain a restrained static glow afterward. Reward
rows start at .75 seconds plus .1 seconds per row; no server result is delayed
or fabricated. Reduced motion/low graphics disable moving lights and sparks.
This is still a two-state sprite transition, not a separately articulated lid.

Verification: 448 client tests, 9 build tests and 4 desktop/mobile browser checks
passed. Browser checks cover four receipt-gated reveals, bulk rewards, errors,
unopened inventory claims, 320/393px layouts, reduced motion and low graphics.
Development-only preview hooks are stripped from production bundles. Real-phone
validation and a new AAB/live deployment have not been performed in this change.
The browser test samples each tier's actual ray/cavity opacity and RGB color at
800ms, in addition to final states. New demo: artifacts/casual-chest-opening-20261014/casual-chests-glow-v2.mp4.

## Exact open-state edit prompt (each call adds its Target tier)

Use case: precise-object-edit.
Asset type: transparent OPEN-state illustration for a mobile casual-strategy/RPG chest-opening animation in GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our approved stylized CLOSED chest. Produce its matching OPEN state, not a different chest.
Primary request: lift the SAME rounded lid backward on its rear hinges about 65–75 degrees so the empty inner cavity is clearly visible. Preserve this chest's same tier palette, big jewel latch identity, trims, decorations, base proportions, mild top/three-quarter view, rounded chunky shapes, soft broad illustrated shading and clean satin finish. Keep the camera and front/right side direction unchanged. The base stays stable; only the lid opens. The inside is EMPTY: no coins, gems, cards, items or predetermined rewards. A little warm softly lit interior is allowed, but no emitted external light/particles; animation effects will be added in code.
Composition: one full open chest on a square transparent canvas. Include the entire raised lid, crown/crystal decorations if present, hinges and base with generous clear margin. Nothing clipped. The base should remain the same visual object as the target, not a flat box or a wider/different model. Match the target's optical size as closely as possible while fitting the lid.
Style invariants: premium stylized 3D/2.5D casual game illustration; smooth clean broad color shapes; NO realistic metal grain, scratches, mirror chrome, photographic reflections, tiny mechanical parts, gritty surfaces or noise. Preserve all target colors and tier-specific shape cues. Do not add a crown to bronze/silver or remove existing gold crown/diamond crystals.
Background: genuinely transparent alpha, clean antialiased edges, preserve transparency. No floor, ground shadow, frame, UI plate, backdrop, scene, text, letters, numbers, logos, watermark, floating sparkles, rays or other objects. Only ONE open empty chest.
