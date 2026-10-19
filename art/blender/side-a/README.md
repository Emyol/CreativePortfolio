# Side A device art

The site's pocket tape player is rendered here, in Blender, as separate layers that the
browser stacks. Nothing is WebGL: reels, tape packs, the knob mark and the keys move with
CSS transforms on these images.

## Commands

From the repo root:

```sh
npm run device:render     # blender -b --factory-startup -P art/blender/side-a/device.py
npm run device:encode     # node scripts/encode-device.mjs: PNGs -> public/device/*.avif|webp|jpg
node scripts/preview-device.mjs 0.3 a   # stack the layers like the site does, for review
npm run device:glb        # the 3D player: out/device-raw.glb -> public/device/device.glb (compressed)
```

`device:glb` runs the `glb` pass through `scripts/blender.mjs` (Blender spawned directly, so the
path with spaces works on Windows), then `scripts/compress-device.mjs` (glTF-Transform: weld,
light simplify, meshopt). The page finds parts and rebuilds materials by name, so pivots,
anchors and material names survive compression. Two pitfalls the pass handles:

- **Bake every boolean before anything moves.** The recesses are cut by cutter objects that
  stay put in world space, so a moved or reparented part loses its cuts.
- **The underside gets a thin skin**, not the full-height `Under` slab, which would fill the
  top's recesses once both are in one model.

`device:render` takes options after `--`: `--only plate,hub` renders some passes,
`--samples 32` renders fast drafts. Raw PNGs land in `art/blender/side-a/out/` (ignored by
Git). Never call `read_factory_settings` through the Blender MCP connection; run headless.

## Outputs

| File | What it is |
|---|---|
| `plate` | Everything that never moves: body, recesses, screen glass, LED, grille, the knob body, the cassette's inside face |
| `shadow` | Contact shadow of the whole device, alone, so it sits on either theme |
| `shell-a`, `shell-b` | Front of the cassette, label up, with the window open; swapped on the flip |
| `pack` | A full tape pack; scaled in the browser to show tape moving reel to reel |
| `hub` | A take-up hub; rotated in the browser |
| `knob` | Knob with its shadow, for the dock (the hero's knob is baked into the plate) |
| `knob-mark` | Just the knob's indicator; rotated to point at the current track |
| `key-up`, `key-down` | One key cap in its well, both states; labels are HTML |
| `underside` | The device's back, for the footer; the sticker is blank for HTML text |
| `beauty` | The 3/4 product shot, for the social card and the 404 page |
| `flip/flip-00..23` | The cassette turning over, for the side B interstitial |
| `device.glb` | The whole device for the real-time 3D hero, flip and footer: keys `Key0`–`Key3`, pivots `HubLPivot`/`HubRPivot`/`KnobMarkPivot`, `Cassette` (`FrontHalf`/`BackHalf`), `PackL`/`PackR`, `OLEDGlass`, `LEDLens`, `Underside` with `StickerAnchor`/`DoorAnchor` corners (`TL`, `TR`, `BR`, `BL`) |
| `layout.json` | Where every layer and every live-text area sits on the plate (`lib/device/layout.ts`) |

Every top-down pass uses one orthographic scale, so anchors in `layout.json` line up
exactly. Change geometry in `device.py` and re-render; `layout.json` follows.
