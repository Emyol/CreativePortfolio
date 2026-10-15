# Redesign: art direction that clears the bar

Looking for: the art direction, imagery and motion level a personality-first portfolio needs
to feel crafted (Japanese / anime / game sensibility), for the whole site, after the first
Kakejiku build read as plain. Gathered 2026-10-15 in a real browser (Chromium, 1440×900),
screenshots at load, after ~3,000px of scroll and after ~9,000px. Stills only: **no motion
below was watched as video**, so every motion line is "unverified, owner to watch".

## What the first build lacked (the diagnosis these references answer)

Every strong reference has **one owned piece of art** carrying the page: a modelled scene, a
hand-drawn character, painted key art. The first build had none; it drew everything from CSS
gradients and procedural blobs, so it looked like a template wearing a theme.

---

## Jesse Zhou: "Jesse's Ramen"

- Link: https://www.jesse-zhou.com/
- Why it works: the whole site is **one 3D object**, a neon night-time ramen stall, and its
  street signpost *is* the navigation (projects / articles / about me / credits). The
  personality is the place, not a paragraph about it.
- How it's built: Three.js, low-poly modelled scene with baked lighting and emissive neon
  (inferred); a "Cooking your ramen…" loader, then a START gate.
- Steal: a single small diorama that stands for the person and doubles as the menu.
- Avoid: the START gate and a WebGL-only menu; keep a real HTML nav and a no-3D path.
- Fit: both
- Motion: **unverified**, owner to watch (camera moves on navigation, inferred)
- Owner:

## Messenger (abeto)

- Link: https://messenger.abeto.co/
- Why it works: an **anime-painted 3D mini planet** (cel-shaded, ink outlines, flat
  Ghibli-like colour) with a blocky, almost kanji-shaped logotype laid over it. It reads as
  2D illustration but you can walk around it.
- How it's built: WebGL with toon shading + outline pass and hand-painted textures (inferred).
- Steal: cel shading + ink outline as the bridge between "anime" and "3D". This is the
  look Blender can author (toon shader, Freestyle/inverted-hull outlines) and export to glTF.
- Avoid: a game you must play to read anything.
- Fit: technique
- Motion: **unverified**, owner to watch
- Owner:

## Zenless Zone Zero official site

- Link: https://zenless.hoyoverse.com/en-us/main
- Why it works: a complete **game-UI graphic system**: diagonal hazard-stripe bands, huge
  condensed numerals ("Background 05"), sticker/tape labels, a film-strip motif, a vertical
  chapter counter (01 → 05) and one loud lime accent on near-white and near-black. Every
  section looks like a screen from the game's menus.
- How it's built: illustrated key art in rounded frames, carousel, fixed side counter.
- Steal: a **system** of 4–5 recurring UI motifs (stripes, numerals, stickers, counter)
  instead of one-off decorations; one accent colour used loudly.
- Avoid: marketing clutter (store badges, ratings); thin carousel text over art.
- Fit: both (voice for the game layer, technique for the chapter system)
- Motion: **unverified**, owner to watch
- Owner:

## Honkai: Star Rail official site

- Link: https://hsr.hoyoverse.com/en-us/
- Why it works: **painted key art** fills the hero edge to edge, with East-Asian ornament
  (wave crests, plum branches, cloud scrolls) framing the corners, and glowing display type
  set into the art rather than on top of a box.
- How it's built: layered illustration (parallax likely, inferred), decorative frames as
  images.
- Steal: ornament that *frames* art at the corners; type that belongs to the art.
- Avoid: everything at full intensity at once.
- Fit: voice (anime art direction)
- Motion: **unverified**, owner to watch
- Owner:

## Huy Phan (huyml.co): Awwwards SOTD + Developer, Oct 14 2026

- Link: https://huyml.co/ (via https://www.awwwards.com/websites/portfolio/)
- Why it works: a **hand-drawn manga-ish self-portrait** physically pushes his giant red
  name onto the page, then the work list opens as tilted, stacked 3D cards. A personal
  site where the illustrated author is the loading animation and the logo.
- How it's built: illustrated character sprite, big serif display type, WebGL/3D card stack
  for work (inferred), audio toggle.
- Steal: the owner as an illustrated character who *does* things on the page. For Miel,
  a chibi/anime self-character fits the brief without putting a photo in the hero.
- Avoid: blurred, low-contrast list text in the work section.
- Fit: voice (strongest personal-site reference here)
- Motion: **unverified**, owner to watch
- Owner:

## mild sugar design

- Link: https://mildsugardesign.jp/ (via Awwwards portfolio list)
- Why it works: a single **cinematic rendered room at night**: a stylised character asleep
  at the desk, warm lamp, city window, 3D "zzz". Instantly cosy and personal.
- How it's built: pre-rendered 3D still/video (inferred) behind a minimal menu.
- Steal: the cosy lit room as the "home" of the site (a creator's room fits a site about
  hobbies, music, games and a shelf of manga).
- Avoid: little scroll content; the menu is the whole site.
- Fit: voice
- Motion: **unverified**, owner to watch
- Owner:

## Garden Eight (Tokyo studio)

- Link: https://garden-eight.com/
- Why it works: **type is the image**: an oversized, calligraphic display face set in
  staggered lines on a flat warm grey, with almost nothing else.
- Steal: one expressive display face used huge, against flat colour. This is the restraint
  counterweight to the busier references.
- Fit: technique
- Motion: **unverified**, owner to watch
- Owner:

## Kenta Toshikura (Japanese developer, personal site)

- Link: https://kentatoshikura.com/
- Why it works: dark film-grain world, chromatic-aberration edges on a circular "lens", huge
  technical sans titles, a 1/5 counter: every project is a scene in a sequence.
- How it's built: WebGL post-processing (grain, RGB split, distortion) (inferred).
- Steal: grain + slight chromatic aberration as the "film" finish over 3D or art.
- Fit: technique
- Motion: **unverified**, owner to watch
- Owner:

## Igloo Inc.

- Link: https://www.igloo.inc/
- Why it works: cinematic WebGL fog, ice and prism light; the camera travels through a
  frozen scene as you scroll.
- Steal: scroll as a **camera move through one scene**, which suits Blender-made assets.
- Avoid: weight and load time; unreadable states mid-transition.
- Fit: technique
- Motion: **unverified**, owner to watch
- Owner:

## WebGL Fluid Simulation (Pavel Dobryakov, MIT)

- Link: https://paveldogreat.github.io/WebGL-Fluid-Simulation/ (source: github.com/PavelDoGreat/WebGL-Fluid-Simulation, MIT; confirm licence before reuse)
- Why it works: real-time GPU fluid; with colour off, low dissipation and a black dye on
  paper it becomes **sumi ink dropped in water**, a living version of the ink-bleed idea
  the first build faked with a radial mask.
- Steal: ink that actually flows (cursor trail, transitions between chapters).
- Avoid: the default neon palette; it must run only at full motion with a still fallback.
- Fit: technique
- Motion: watched as stills in motion (dye moved between captures); full behaviour owner to watch
- Owner:

## Samukawa-jinja Shrine (AQUARING): Awwwards Honourable Mention

- Link: http://samukawajinjya.jp/ (via https://www.awwwards.com/AQUARING.inc/)
- Why it works: white mist and ink-wash shapes with vertical Japanese type, very quiet.
- Steal: vertical type set in columns, used sparingly, as the "Japanese" signal.
- Fit: technique
- Motion: **unverified**, owner to watch (captures were mid-fade)
- Owner:

---

## Not logged

- Persona 5 official site: only its age gate rendered; not judged.
- Henry Heffernan, Lusion, Bruno Simon: start gate or timed out in the headless browser;
  not judged.
