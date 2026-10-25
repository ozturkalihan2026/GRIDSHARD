# Single native circuit floor — 25 October 2026

`island-player.webp` and `island-enemy.webp` contain the complete floor,
metal rim and pillar foundation. The 15 painted plates have equal dimensions
in ALL three rows; no CSS plate or covering rectangle is layered above them.

Authoring coordinates (1254 square master): floor `(264,260)` to `(992,664)`;
each plate 140×130, horizontal/vertical seam 7. See `registration.json`.
The 1024-square WebP export uniformly scales these coordinates.

Preparation: `tools/prepare-native-circuits.cjs`, using Sharp. Original generated
PNG sources and registered masters are in `artifacts/battle-native-20261025/`.
Set `GRIDSHARD_SHARP_MODULE` to the available Sharp module if not installed locally.
This preparation runs offline; no raster assembly runs in the game.

Built-in imagegen produced the revised source images. Final prompt directions,
source provenance and validation are recorded in
`docs/SAVAS_TEK_ZEMIN_ESIT_HUCRELER_20261025.md`.
