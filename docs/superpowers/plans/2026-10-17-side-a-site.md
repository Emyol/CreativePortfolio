# Side A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Kakejiku public site with the Side A World: the site is a pocket tape player Miel built, carrying the mixtape he would make you, with songs played in the site through Spotify's embed.

**Architecture:** Device art is rendered by headless Blender into layered sprites plus one `layout.json` of anchor points; the browser stacks the sprites and moves only reels, tape packs, knob and keys with transforms (no WebGL). A pure `lib/tape.ts` owns tracks, sides, keys and knob maths; `lib/playback.ts` is a tiny external store fed by the Spotify iFrame API and read by the reels and the screen. The content layer, motion tiers, Lenis, hash navigation, keys and sound modules are kept; every Kakejiku component is deleted.

**Tech Stack:** Next.js 16.4 (App Router), React 19.3, TypeScript 5, CSS Modules, GSAP 3 + ScrollTrigger + `@gsap/react`, Lenis, Zod 4, Vitest + Testing Library, Playwright + axe. Blender 5.2 (headless) for art.

**Spec:** `docs/superpowers/specs/2026-10-17-side-a-design.md`. Read it before starting; this plan argues from it.

## Global Constraints

- Read `node_modules/next/dist/docs/` before writing Next code (`AGENTS.md`). `next/font/google` supports `axes`; Archivo has `wdth` 62 to 125; Doto exists; redirects go in `next.config.ts` `redirects()`.
- **No WebGL, no three.js.** Device motion is CSS transforms on rendered sprites.
- Palette tokens exactly: `--table #E4E6E9`, `--ink #141518`, `--ink-muted #5B5F68`, `--alu #D3D6DB`, `--oled #050506`, `--signal #FF2E00` (the only accent), `--oled-text #FF5A1F`. Dark theme via `prefers-color-scheme` redefines `--table`, `--ink`, `--ink-muted`, `--alu` only.
- Fonts: Archivo (variable, `axes: ["wdth"]`) for display and body, Space Mono (400, 700) for device labels and metadata, Doto for OLED screen text only. All via `next/font/google`.
- Motion timings: key press 100 ms / release 160 ms; knob 280 ms ease-in-out; screen flicker 120 ms opacity steps; dock rise 240 ms ease-out, sink 160 ms; power-on about 600 ms once per session; section fade-up 8 px once. Custom curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`.
- Every GSAP setup lives in `useGSAP` or `gsap.context` and reverts on unmount. Continuous values (reel angle, velocity) never go through React state.
- Motion tiers from `lib/motion/tier.ts`: `full`, `lite`, `none`; reduced motion applies **live**.
- Storage keys use the prefix `side-a:` (was `kakejiku:`).
- Spotify: script `https://open.spotify.com/embed/iframe-api/v1`, loaded only on the first play press; one controller per page; the embed stays visible and unmodified.
- Mixtape max **12** songs; `links` max **4**; footer links seeded: `GitHub` → `https://github.com/Emyol`, `Professional site` → `https://project-miel.vercel.app`.
- Content rules: never invent content; fixtures are clearly fake and refused in production; no phone number anywhere; toolbox limited to `PROFESSIONAL_STACK`; songs are never presented as Miel's work.
- Copy: plain words, no em dashes, no eyebrow labels, no numbering except track numbers.
- Blender: run `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P <script>` from the repo root. Never call `bpy.ops.wm.read_factory_settings` through the Blender MCP connection. Cycles on OptiX.
- No Claude attribution in commits or PRs (project `CLAUDE.md`).

## Review Focus

1. **Launch with an empty `seed.json`** (today's real state): the home page must render the device with four blank keys, no dock links but `list`, no flip, no `h2`, and no crash. Pinned in Tasks 3, 4, 5 and 6.
2. **Spotify script blocked** (privacy extension, offline): pressing play must fall back within 8 s to an error state that keeps the plain "Open in Spotify" link working; reels never spin. Pinned in Task 9.
3. **Leaving for an event page mid-song:** the deck unmounts, `controller.destroy()` runs, playback resets to `idle`, reels stop. Pinned in Task 9.
4. **Reduced motion switched on while a song plays:** reels and packs freeze where they are, but the song keeps playing and the screen keeps its elapsed time. Pinned in Task 7.
5. **Long or unbroken titles on the OLED screen and in track rows** (song titles, event names): the screen truncates to one line with an ellipsis and the full text is in the accessible name; rows wrap without horizontal overflow. Pinned in Task 6 and Task 9.

---

### Task 1: Device art pipeline and stand-in set

Renders every sprite the components need, at final size, plus the anchor map. Stand-in quality is fine (Task 12 polishes); geometry and file names are final.

**Files:**
- Create: `art/blender/side-a/common.py` (copy of `art/blender/concepts/src/common.py`, plus `render_pass(slug, objects_visible, transparent=True)`)
- Create: `art/blender/side-a/device.py` (builds the device top-down from `concept_b.py`'s geometry; renders all passes; writes `layout.json`)
- Create: `art/blender/side-a/README.md` (one command per script, what each output is)
- Create: `public/device/*` (outputs, below) and `public/device/layout.json`
- Create: `lib/device/layout.ts`
- Test: `lib/device/layout.test.ts`

**Interfaces:**
- Produces: `public/device/` files, each as `.avif` and `.webp`: `plate`, `shadow`, `shell-a`, `shell-b`, `hub`, `pack`, `knob`, `key-up`, `key-down`, `underside`, `beauty` (3/4 shot, also `.jpg` 1200x630 for og), and `flip/flip-00.webp` to `flip/flip-23.webp`.
- Produces: `lib/device/layout.ts`:
  ```ts
  type Pt = { x: number; y: number };                 // 0..1 of plate width / height
  type Rect = { x: number; y: number; w: number; h: number };
  export type DeviceLayout = {
    plate: { width: number; height: number };          // px of the @2x render
    reels: { left: Pt; right: Pt; hub: number };        // hub diameter, fraction of plate width
    pack: { min: number; max: number };                 // tape-pack diameters, fraction of plate width
    knob: { centre: Pt; size: number };
    keys: [Rect, Rect, Rect, Rect];                     // left to right
    keyLabels: [Rect, Rect, Rect, Rect];                // printed-label areas under each key
    screen: Rect; window: Rect; nameplate: Rect;
    underside: { width: number; height: number; sticker: Rect };
    flipFrames: number;
  };
  export const deviceLayoutSchema: z.ZodType<DeviceLayout>;
  export const DEVICE: DeviceLayout;                   // parsed from public/device/layout.json at import
  export const pct: (n: number) => string;             // 0.25 -> "25%"
  ```

- [ ] **Step 1: Write the failing test** `lib/device/layout.test.ts`

```ts
test("layout.json parses and every rect sits inside the plate", () => {
  for (const r of [...DEVICE.keys, ...DEVICE.keyLabels, DEVICE.screen, DEVICE.window, DEVICE.nameplate])
    expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1 && r.y + r.h <= 1).toBe(true);
});
test("keys are four, ordered left to right, not overlapping", () => {
  expect(DEVICE.keys).toHaveLength(4);
  for (let i = 1; i < 4; i++) expect(DEVICE.keys[i].x).toBeGreaterThanOrEqual(DEVICE.keys[i - 1].x + DEVICE.keys[i - 1].w);
});
test("every sprite the components use exists in both formats", () => {
  for (const name of ["plate","shadow","shell-a","shell-b","hub","pack","knob","key-up","key-down","underside","beauty"])
    for (const ext of ["avif","webp"]) expect(existsSync(`public/device/${name}.${ext}`), `${name}.${ext}`).toBe(true);
  for (let i = 0; i < DEVICE.flipFrames; i++) expect(existsSync(`public/device/flip/flip-${String(i).padStart(2, "0")}.webp`)).toBe(true);
});
test("the pack can shrink below its full size and never below the hub", () => {
  expect(DEVICE.pack.min).toBeGreaterThan(DEVICE.reels.hub);
  expect(DEVICE.pack.max).toBeGreaterThan(DEVICE.pack.min);
});
```

- [ ] **Step 2: Run** `npx vitest run lib/device/layout.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Write `device.py`.** Rebuild the concept geometry (body 7.2 x 4.9 x 0.62, window, screen, knob, four keys, `miel` nameplate) with an orthographic camera straight down, `ortho_scale` fitted to the body plus 6% margin, render 2400 px wide, `film_transparent = True`. One pass per sprite by toggling visibility: `plate` hides reels, packs, shell, knob and keys; `shadow` is a shadow-catcher pass of the full device; reels, packs, knob and keys each render alone, centred, on transparent. Flip frames: the cassette shell alone, rotating 0 to 180 degrees about its long axis over 24 frames, 1200 px wide. `underside`: the body flipped, with rubber feet and a blank sticker rect. `beauty`: the concept's 3/4 camera, opaque background. After rendering, project each anchor object's bounds through the camera to get normalised rects/points (`bpy_extras.object_utils.world_to_camera_view`) and write `public/device/layout.json`. Write AVIF and WebP with Blender's own `file_format` (read the enum; do not hardcode if absent), quality 80.

- [ ] **Step 4: Implement `lib/device/layout.ts`** (zod schema mirroring the type; `DEVICE = deviceLayoutSchema.parse(json)`; import the JSON from `@/public/device/layout.json`).

- [ ] **Step 5: Render and run** `blender -b --factory-startup -P art/blender/side-a/device.py`, then `npx vitest run lib/device/layout.test.ts`. Expected: PASS. Open `public/device/plate.webp` and `beauty.jpg` and look at them: reels centred on the window's hub holes, nothing clipped.

- [ ] **Step 6: Commit** `feat: render the Side A device as layered stand-in sprites` (body: why layered top-down sprites, what `layout.json` is for).

---

### Task 2: Content model for the mixtape and links

**Files:**
- Modify: `lib/content/schema.ts`, `lib/content/fixtures.ts`, `lib/content/seed.json`
- Test: `lib/content/schema.test.ts`, `lib/content/load.test.ts`

**Interfaces:**
- Produces: `musicSongSchema` and `type MixtapeSong = { title: string; artist: string; spotify: string; note?: string }`; `type FooterLink = { label: string; url: string }`; `SiteContent` gains `links: FooterLink[]`. The old `Track` type export is removed (the name moves to `lib/tape.ts`).

- [ ] **Step 1: Write failing tests** in `schema.test.ts`:

```ts
const song = { title: "A", artist: "NIKI", spotify: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" };
test("a song needs title, artist and an open.spotify.com track URL", () => {
  expect(musicSongSchema.safeParse(song).success).toBe(true);
  expect(musicSongSchema.safeParse({ ...song, spotify: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc" }).success).toBe(true);
  for (const bad of ["https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC", "https://example.com/track/x", "spotify:track:4uLU6hMCjMI75M1A2tKUQC"])
    expect(musicSongSchema.safeParse({ ...song, spotify: bad }).success, bad).toBe(false);
  expect(musicSongSchema.safeParse({ title: "A", spotify: song.spotify }).success).toBe(false);
});
test("the mixtape holds at most 12 songs", () => {
  const base = { ...FIXTURES, music: Array(13).fill(song) };
  expect(contentSchema.safeParse(base).error?.issues[0].message).toMatch(/12/);
});
test("links are https, at most four, and default to none", () => {
  expect(contentSchema.parse({ ...FIXTURES, links: undefined }).links).toEqual([]);
  expect(contentSchema.safeParse({ ...FIXTURES, links: [{ label: "x", url: "http://a.b" }] }).success).toBe(false);
  expect(contentSchema.safeParse({ ...FIXTURES, links: Array(5).fill({ label: "x", url: "https://a.b" }) }).success).toBe(false);
});
```
And in `load.test.ts`: `seed.json` parses and its `links` equal exactly `[{label:"GitHub",url:"https://github.com/Emyol"},{label:"Professional site",url:"https://project-miel.vercel.app"}]`, and `seed.music` is `[]`.

- [ ] **Step 2: Run** `npx vitest run lib/content`. Expected: FAIL.

- [ ] **Step 3: Implement.** Spotify regex: `^https://open\.spotify\.com/track/[A-Za-z0-9]{22}(\?.*)?$`; message "spotify must be an open.spotify.com track link". `music: z.array(musicSongSchema).max(12, "a mixtape holds at most 12 songs")`. `links: z.array(z.object({ label: text, url: z.url().startsWith("https://", "links must be https") })).max(4).default([])`. Fixtures: 6 songs titled `Fixture song 1` to `Fixture song 6`, artist `Fixture artist`, `spotify` built from a fixed 22-char fake id per song (`"FixtureTrackId" + String(i).padStart(8, "0")`), notes on songs 1 and 3, song 4's title `FixtureSongWithAnUnbrokenTitleThatMustTruncate`; fixtures `links` = the two real links. Seed: add the two `links`; leave everything else empty.

- [ ] **Step 4: Run** `npx vitest run lib/content`. Expected: PASS. (Other suites referencing the old music shape are deleted in Task 4; do not fix them here.)

- [ ] **Step 5: Commit** `feat: model the mixtape as Spotify songs and add footer links`.

---

### Task 3: Tape logic

Pure functions for tracks, sides, keys, knob and tape packs. Replaces `lib/chapters.ts`.

**Files:**
- Create: `lib/tape.ts`
- Test: `lib/tape.test.ts`
- Delete: `lib/chapters.ts`, `lib/chapters.test.ts` (port `shouldHandleChapterKey` and its tests as `shouldHandleTrackKey`)

**Interfaces:**
- Consumes: `SiteContent` (Task 2).
- Produces:
  ```ts
  export type TrackId = "about" | "events" | "mixtape" | "people" | "made" | "on-rotation";
  export type SideId = "a" | "b";
  export type Track = { id: TrackId; side: SideId; label: string; number: number }; // number: 1..n across the tape
  export const TRACK_ORDER: readonly { id: TrackId; side: SideId; label: string }[];
  // labels: "about", "events", "mixtape", "people" (side a); "made", "on rotation" (side b)
  export function visibleTracks(c: SiteContent): Track[];
  export function sideOf(tracks: Track[], id: TrackId | null): SideId;       // null -> "a"
  export function sideTracks(tracks: Track[], side: SideId): Track[];
  export function hasSide(tracks: Track[], side: SideId): boolean;
  export type KeySlot = { index: 0 | 1 | 2 | 3; track: Track | null };
  export function keySlots(tracks: Track[], side: SideId): KeySlot[];         // always length 4
  export function knobAngle(tracks: Track[], side: SideId, current: TrackId | null): number;
  export function trackForKey(key: string, tracks: Track[], side: SideId): Track | undefined;
  export function shouldHandleTrackKey(e: KeyLike): boolean;
  export function packDiameters(progress: number, pack: { min: number; max: number }): { left: number; right: number };
  export const formatTrackNumber: (n: number) => string;                     // 1 -> "01"
  ```

- [ ] **Step 1: Write the failing tests** (`lib/tape.test.ts`), with `FIXTURES` and an `empty` content built from it with every list emptied and `about.letter = []`:

```ts
test("all six tracks in order, numbered across the tape", () => {
  expect(visibleTracks(FIXTURES).map((t) => [t.id, t.side, t.number])).toEqual([
    ["about","a",1],["events","a",2],["mixtape","a",3],["people","a",4],["made","b",5],["on-rotation","b",6]]);
});
test("empty tracks close up the numbering", () => {
  const c = { ...FIXTURES, events: [], hobbies: [] };
  expect(visibleTracks(c).map((t) => `${t.id}:${t.number}`)).toEqual(["about:1","mixtape:2","people:3","on-rotation:4"]);
});
test("an empty tape has no tracks, no side b, four blank keys", () => {
  const t = visibleTracks(empty);
  expect(t).toEqual([]);
  expect(hasSide(t, "b")).toBe(false);
  expect(keySlots(t, "a").map((k) => k.track)).toEqual([null, null, null, null]);
});
test("side b keys use two slots and blank the rest", () => {
  const t = visibleTracks(FIXTURES);
  expect(keySlots(t, "b").map((k) => k.track?.id ?? null)).toEqual(["made", "on-rotation", null, null]);
});
test("knob detents spread over 270 degrees", () => {
  const t = visibleTracks(FIXTURES);
  expect(knobAngle(t, "a", null)).toBe(-135);
  expect(knobAngle(t, "a", "about")).toBe(-135);
  expect(knobAngle(t, "a", "people")).toBe(135);
  expect(knobAngle(t, "a", "events")).toBe(-45);
  expect(knobAngle(t, "b", "made")).toBe(-135);
  expect(knobAngle(visibleTracks({ ...FIXTURES, shelf: [] }), "b", "made")).toBe(0); // one detent points up
});
test("number keys follow the current side; out of range is undefined", () => {
  const t = visibleTracks(FIXTURES);
  expect(trackForKey("1", t, "b")?.id).toBe("made");
  expect(trackForKey("3", t, "b")).toBeUndefined();
  expect(trackForKey("5", t, "a")).toBeUndefined();
  expect(trackForKey("b", t, "a")).toBeUndefined();
});
test("tape packs trade area: full left at 0, full right at 1, equal area at the middle", () => {
  const p = { min: 0.08, max: 0.2 };
  expect(packDiameters(0, p)).toEqual({ left: 0.2, right: 0.08 });
  expect(packDiameters(1, p)).toEqual({ left: 0.08, right: 0.2 });
  const m = packDiameters(0.5, p);
  expect(m.left).toBeCloseTo(m.right);
  expect(packDiameters(-1, p)).toEqual(packDiameters(0, p)); // clamped
});
```
Plus the ported `shouldHandleChapterKey` cases renamed to `shouldHandleTrackKey`, and:

```ts
test("today's seed has no tracks", () => {
  expect(visibleTracks(parseContent(seed, "seed.json"))).toEqual([]);
});
```

- [ ] **Step 2: Run** `npx vitest run lib/tape.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `lib/tape.ts`.** `hasContent`: about → `about.letter.length > 0`; events → `events`; mixtape → `music`; people → `people`; made → `hobbies`; on-rotation → `shelf`. Knob: `n` detents on the side; `n <= 0` or `current` not on the side → -135; `n === 1` → 0; else `-135 + i * 270 / (n - 1)`. Packs: clamp progress to [0, 1]; diameter for fill fraction `f` is `sqrt(min² + (max² - min²) * f)`; left uses `f = 1 - progress`, right `f = progress`.

- [ ] **Step 4: Run** `npx vitest run lib/tape.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit** `feat: add tape logic for tracks, sides, keys and knob`.

---

### Task 4: New shell, tracklist and Kakejiku removal

After this task the site is plain but working: tokens, fonts, sections per track, `/tracklist`, redirect, and no Kakejiku code.

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `next.config.ts`, `package.json` (drop `kanji:fetch`, `texture:paper`), `lib/motion/tier.ts` (drop `ENTRANCE_KEY`, `ENTRANCE_PREPAINT`), `lib/motion/tier.test.ts`, `lib/keys.ts` and `lib/sound.ts` (key prefix `side-a:`), `components/motion/HashLinks.tsx` (prefix), `components/motion/SmoothScroll.tsx` (`/mokuroku` → `/tracklist`), `components/motion/ActiveChapter.tsx` → rename to `components/motion/ActiveTrack.tsx` (`ActiveTrackProvider`, `useActiveTrack(): TrackId | null`), `components/IndexBody.tsx` (switch on `TrackId`, mixtape rows `title, artist` linking to `spotify`), `lib/motion/navigate.ts` (`data-chapter` → `data-track`, `data-chapter-heading` → `data-track-heading`), `lib/rules.test.ts` (drop the glossary test; keep phone and filter tests)
- Create: `components/tracks/TrackSection.tsx` + `.module.css`, `components/tracks/TapeBody.tsx`, `app/tracklist/page.tsx` + `.module.css`
- Delete: `app/mokuroku/`, `components/{kanji,hero,rail}/`, `components/chapters/{ChapterSection,ChapterBody,Music}*`, `components/motion/{BrushDivider,InkBleed,SealStamp,SeasonController,WeatherGust}*`, `components/motion/transitions.test.tsx`, `components/game/Konami*`, `components/frame/ScrollFrame*`, `components/Ja.tsx`, `lib/{kanji,glossary.ts,seasons*,weather*,konami*,bento*,thread*,tilt*,useTypewriter.ts}`, `lib/motion/{mountains*,finishOnFocus.ts}`, `scripts/fetch-kanjivg.mjs`, `scripts/make-paper-noise.mjs`, `public/kanji/`, `public/textures/`, `e2e/{entrance,rail,seasons,mokuroku}.spec.ts`. Then delete any `lib/` or `components/` module that nothing imports except its own test (check with a grep for its import path).
- Test: `e2e/structure.spec.ts`, `e2e/tracklist.spec.ts`, `components/tracks/TrackSection.test.tsx`, `components/tracks/TapeBody.test.tsx`

**Interfaces:**
- Consumes: `visibleTracks`, `Track`, `formatTrackNumber` (Task 3).
- Style: the owner chose the **Screen** treatment (spec, "Section style: Screen"): the `h2` in Doto `--oled-text` with a glow above a dark `--oled` panel (`.panel`, inset 3 px graphite border, radius 14 px) holding the body; light text inside. See the prototype's variant B (`prototype/side-a`, `prototypes/side-a/index.html`, the `[data-v="B"]` rules) for reference values, not code to copy.
- Produces: `<TrackSection track={Track}>{children}</TrackSection>` renders `<section id={track.id} data-track={track.id} data-side={track.side} aria-labelledby="{id}-title">` with `<h2 id="{id}-title" tabIndex={-1} data-track-heading>` whose text is the label and a visually separate `aria-hidden` number (`01`). `<TapeBody tracks content flip?: ReactNode />` renders side A sections, then `flip` only when `hasSide(tracks, "b")`, then side B sections; each section body comes from a switch on `TrackId`. `app/page.tsx` structure that later tasks slot into: `<ActiveTrackProvider ids>` → `<header data-hero id="top">` (empty until Task 5) → `<main id="main" tabIndex={-1}><TapeBody /></main>` → footer (the old `Footer` stripped of KanjiVG and roller until Task 10).
- The track bodies for this task are the existing `About`, `Events`, `People`, `Hobbies`, `Shelf` components stripped to plain markup (no kanji, ink, tilt, bento) and moved to `components/tracks/`: `LinerNotes` (about), `LiveRecordings` (events, a list of cards linking to `/events/<slug>`), `Featuring` (people), `Made` (hobbies), `OnRotation` (shelf, plain list with notes, no dialogue box). Mixtape renders a placeholder `<ol>` of `title, artist` until Task 9.

- [ ] **Step 1: Write failing e2e** `e2e/structure.spec.ts` (replace the file):

```ts
const TRACKS = [["about","about"],["events","events"],["mixtape","mixtape"],["people","people"],["made","made"],["on-rotation","on rotation"]];
test("one h1, one h2 per track in tape order", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveAccessibleName("Miel");
  const ids = await page.locator("section[data-track]").evaluateAll((s) => s.map((e) => e.id));
  expect(ids).toEqual(TRACKS.map(([id]) => id));
  for (const [id, label] of TRACKS) await expect(page.locator(`section#${id} h2`)).toHaveAccessibleName(label);
});
test("skip links: content first, then the track list", async ({ page }) => { /* Tab → "Skip to content" → Enter focuses #main; second Tab → "Skip to the track list" with href /tracklist */ });
test("no Kakejiku left: no Japanese characters, no KanjiVG credit, no canvas at rest", async ({ page }) => {
  await gotoReady(page, "/");
  expect(await page.locator("body").innerText()).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
  await expect(page.getByText("KanjiVG")).toHaveCount(0);
});
```
`e2e/tracklist.spec.ts`: `/tracklist` lists every visible track as an `h2` and every event links to its page; `/mokuroku` responds with a redirect to `/tracklist` (`expect(page).toHaveURL(/\/tracklist$/)`).
`components/tracks/TrackSection.test.tsx`: the number is `aria-hidden`; the heading's accessible name is the label only. `components/tracks/TapeBody.test.tsx`: fixtures render six sections in tape order and the `flip` node between `people` and `made`; with `hobbies` and `shelf` emptied, four sections and no `flip` node.

- [ ] **Step 2: Run** `npx vitest run components/tracks && npm run test:e2e -- structure tracklist`. Expected: FAIL.

- [ ] **Step 3: Delete the Kakejiku files listed above**, then rename and rewire the kept modules. `app/layout.tsx`: fonts `Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-sans" })`, `Space_Mono({ weight: ["400","700"], subsets: ["latin"], variable: "--font-mono" })`, `Doto({ subsets: ["latin"], variable: "--font-dot" })`; metadata title "Miel", description "Miel's tape: the events he went to, the songs he loves and the people around him."; skip links "Skip to content" (`#main`) and "Skip to the track list" (`/tracklist`); no `InlineScript`, no noscript kanji style, no `Konami`. `globals.css`: the palette tokens from Global Constraints on `:root`, the dark block under `@media (prefers-color-scheme: dark)` (`--table #17181B`, `--ink #ECEDEF`, `--ink-muted #A3A7AF`, `--alu #2A2C31`), the two easing tokens, focus ring `2px solid var(--signal)`, keep the `data-tier="none"` rules and `.sr-only`. `next.config.ts`: `redirects()` returns `[{ source: "/mokuroku", destination: "/tracklist", permanent: true }]`.

- [ ] **Step 4: Run** `npm run typecheck && npx vitest run && npm run test:e2e -- structure tracklist navigation accessibility`. Expected: PASS. Fix `navigation.spec.ts` selectors to `#<track>-title` and key `"4"` for people; drop its hero-menu test (Task 5 rewrites it). `accessibility.spec.ts` keeps running axe with no serious violations.

- [ ] **Step 5: Commit** `refactor: strip Kakejiku and lay out the tape as plain tracks`.

---

### Task 5: The device in the hero

**Files:**
- Create: `components/device/Device.tsx` + `.module.css`, `components/device/TapeKeys.tsx`, `components/device/Screen.tsx`, `components/device/Sprite.tsx`
- Modify: `app/page.tsx` (hero renders `<Device variant="hero" />`)
- Test: `components/device/Device.test.tsx`

**Interfaces:**
- Consumes: `DEVICE`, `pct` (Task 1); `Track`, `SideId`, `keySlots`, `knobAngle`, `formatTrackNumber` (Task 3).
- Produces:
  - `<Sprite name="plate" | ... className? style? />`: `<picture>` with AVIF then WebP source, `alt=""`, `width`/`height` from the layout, `decoding="async"`.
  - `<TapeKeys tracks side current interactive />`: a `<nav aria-label="Tape">` of four slots positioned by `DEVICE.keys`; a slot with a track is `<a href="#{id}" data-key-index aria-current={current===id ? "true" : undefined}>` containing the key sprite and the printed label (Space Mono, under the key at `DEVICE.keyLabels`); a blank slot is a `<span aria-hidden="true" data-blank-key>` with the key sprite only. When `interactive` is false the nav gets `inert`.
  - `<Screen lines={[string, string?]} live? />`: absolutely placed at `DEVICE.screen`, Doto text in `--oled-text`, single-line ellipsis per line, `title` attribute with the full text.
  - `<Device variant="hero" tracks side current interactive />`: stacks `shadow`, `plate`, `shell-a|shell-b`, two `pack` sprites (`data-pack="left|right"`), two `hub` sprites (`data-reel="left|right"`), `knob` (`data-knob`, rotated by `knobAngle`), `TapeKeys`, `Screen`, and the `h1` "Miel" printed at `DEVICE.nameplate` in Space Mono lowercase (`miel`; accessible name "Miel" via `aria-label`). Every layer is positioned with `pct()` so the device scales with its container (`aspect-ratio` from `DEVICE.plate`).

- [ ] **Step 1: Write failing tests** (`Device.test.tsx`), rendering with fixtures and `MotionTierContext` `none`:

```ts
test("the h1 is Miel and the art is decorative", () => {
  render(<Device variant="hero" tracks={t} side="a" current={null} interactive />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Miel");
  for (const img of document.querySelectorAll("img")) expect(img).toHaveAttribute("alt", "");
});
test("side a keys link to its four tracks with printed labels", () => {
  render(<Device variant="hero" tracks={t} side="a" current="events" interactive />);
  const nav = screen.getByRole("navigation", { name: "Tape" });
  expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#about","#events","#mixtape","#people"]);
  expect(within(nav).getByRole("link", { name: "events" })).toHaveAttribute("aria-current", "true");
});
test("empty tape: four blank keys, nothing focusable", () => {
  render(<Device variant="hero" tracks={[]} side="a" current={null} interactive />);
  expect(document.querySelectorAll("[data-blank-key]")).toHaveLength(4);
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});
test("a non-interactive device is inert", () => {
  render(<Device variant="hero" tracks={t} side="a" current={null} interactive={false} />);
  expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
});
test("the knob points at the current track", () => {
  render(<Device variant="hero" tracks={t} side="a" current="people" interactive />);
  expect(document.querySelector<HTMLElement>("[data-knob]")!.style.rotate).toBe("135deg");
});
test("an unbroken title truncates on screen but keeps the full text", () => {
  render(<Screen lines={["FixtureSongWithAnUnbrokenTitleThatMustTruncate"]} />);
  expect(screen.getByTitle("FixtureSongWithAnUnbrokenTitleThatMustTruncate")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run** `npx vitest run components/device`. Expected: FAIL.
- [ ] **Step 3: Implement the four components.** The knob uses the CSS `rotate` property (not `transform`) so Task 7 can own `transform` on reels without collisions, with `transition: rotate 280ms var(--ease-in-out)` (zeroed at tier `none` by the global rules). The hero section is `min-height: 100dvh`, device centred and capped at `min(92vw, 1180px)`; hero screen shows `["SIDE A", "{01} {label}"]` for the first track, or `["SIDE A"]` on an empty tape.
- [ ] **Step 4: Run** `npx vitest run components/device && npm run typecheck`. Expected: PASS. Run `npm run dev:fixtures` and look at `/` at 1440x900 and 390x844: device fits, labels sit under keys, no horizontal scroll.
- [ ] **Step 5: Commit** `feat: put the tape player in the hero`.

---

### Task 6: Dock, active track, shortcuts and key sound

**Files:**
- Create: `components/device/Dock.tsx` + `.module.css`, `components/device/HomeTape.tsx` (client component owning tracks, side, current, hero/dock swap), `components/device/useTrackKeys.ts`
- Modify: `app/page.tsx` (render `<HomeTape tracks>` around hero + main + footer), `lib/sound.ts` (add `playKey()`, `playClunk()`), `components/game/KeysToggle.tsx` (label "Track keys")
- Delete: whatever of the old keys listener lived in `components/rail/` (already gone) and its tests
- Test: `components/device/Dock.test.tsx`, `lib/sound.test.ts`, `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: `Device`, `TapeKeys`, `Screen` (Task 5); `useActiveTrack` (Task 4); `sideOf`, `sideTracks`, `trackForKey`, `shouldHandleTrackKey`, `hasSide` (Task 3); `scrollToId` (`lib/motion/navigate`).
- Produces: `<Dock tracks side current visible />`, a fixed bottom strip in `--alu` with: a mini cassette window (two `hub` sprites, `data-reel="dock-left|dock-right"`), `Screen` (`SIDE A|B`, `{01} {label}`), the knob sprite, `TapeKeys` (`interactive={visible}`), and three text buttons: `list` (link to `/tracklist`), `SoundToggle`, `KeysToggle`. `HomeTape` observes `[data-hero]` with an IntersectionObserver: hero in view → hero device interactive, dock `inert` and translated out; hero out → dock visible and interactive, hero device inert. `useTrackKeys(tracks, side)` binds keys 1-4 and `b`/`B` (flip: `scrollToId` of the first track on the other side, if that side has tracks), gated by `chapterKeysEnabled()` (rename to `trackKeysEnabled()` in `lib/keys.ts`) and `shouldHandleTrackKey`. Pressing any tape key (pointer or keyboard) calls `playKey()`.

- [ ] **Step 1: Write failing tests.** `Dock.test.tsx`: dock shows `list` linking to `/tracklist` even on an empty tape; dock keys are inert when `visible` is false; screen shows `SIDE B` when `side="b"`. `lib/sound.test.ts`: `playKey()` and `playClunk()` do nothing (no `AudioContext` constructed) while sound is off. `e2e/navigation.spec.ts` (both motion settings):

```ts
test("the dock rises once the hero is gone and its keys navigate", async ({ page }) => {
  await gotoReady(page, "/");
  await expect(page.locator("[data-dock]")).toHaveAttribute("inert", "");
  await page.mouse.wheel(0, 1200);
  await expect(page.locator("[data-dock]")).not.toHaveAttribute("inert");
  await page.locator("[data-dock]").getByRole("link", { name: "people" }).click();
  await headingAtTop(page, "people");
  await expect(page.locator("#people-title")).toBeFocused();
  await expect(page).toHaveURL(/#people$/);
});
test("keys 1-4 follow side a, B flips to side b, then 1 is made", async ({ page }) => {
  await gotoReady(page, "/#about");
  await page.keyboard.press("3"); await headingAtTop(page, "mixtape");
  await page.keyboard.press("b"); await headingAtTop(page, "made");
  await page.keyboard.press("2"); await headingAtTop(page, "on-rotation");
});
test("shortcuts are ignored while typing and when turned off", async ({ page }) => { /* focus a dock button then press "Track keys" toggle; "2" does nothing */ });
test("a cold deep link lands on the track with focus on its heading", async ({ page }) => { /* /#mixtape */ });
```

- [ ] **Step 2: Run** `npx vitest run components/device lib/sound.test.ts && npm run test:e2e -- navigation`. Expected: FAIL.
- [ ] **Step 3: Implement.** Key press (hero and dock): on `pointerdown`, or `keydown` Enter/Space on a focused key, set `data-pressed` on the slot: the sprite swaps to `key-down` and the key gets `transform: translateY(1px) scale(0.98)` with a 100 ms `var(--ease-out)` transition; on release the attribute clears with a 160 ms transition; at tier `none` only the sprite swaps. Navigation happens on `click` as usual. Dock rise and sink are CSS transitions on `transform` (`translateY(110%)` ↔ `0`), 240 ms `var(--ease-out)` in, 160 ms out; under `data-tier="none"` the global rules zero them. `playKey()`: a 25 ms filtered noise burst at about 3 kHz with a 4 ms attack (a mechanical click); `playClunk()`: a 90 ms low thump (120 Hz to 60 Hz sine with a noise transient). Both synthesised with Web Audio, no files.
- [ ] **Step 4: Run** the same commands. Expected: PASS.
- [ ] **Step 5: Commit** `feat: dock the tape keys and add track shortcuts`.

---

### Task 7: Reels and tape packs

**Files:**
- Create: `lib/motion/reels.ts`, `components/device/useReelMotion.ts`
- Modify: `components/device/HomeTape.tsx` (mount the hook once for hero and dock reels and packs)
- Test: `lib/motion/reels.test.ts`, `e2e/reduced-motion-live.spec.ts`

**Interfaces:**
- Consumes: `getLenis()` (`lib/motion/navigate`), `useMotionTier`, `packDiameters` and `DEVICE.pack` (Tasks 1, 3), `getPlayback`/`subscribePlayback` (Task 9; until then import from a stub `lib/playback.ts` created here with `getPlayback = () => ({ status: "idle", song: null, position: 0, duration: 0 })` and a no-op subscribe; Task 9 replaces the body, not the signatures).
- Produces:
  ```ts
  export type ReelState = { angle: number; omega: number };        // degrees, degrees per second
  export const PLAY_RPS = 0.6;                                     // revolutions per second while playing
  export const MAX_OMEGA = 1080;
  export function stepReel(s: ReelState, dt: number, input: { velocity: number; playing: boolean; tier: MotionTier }): ReelState;
  ```
  `useReelMotion(scope: RefObject<HTMLElement>, tracks: Track[])`: on `gsap.ticker`, steps one shared `ReelState` and writes `transform: rotate(<angle>deg)` to every `[data-reel]` in scope (right reels turn the same direction; tape runs left to right); a ScrollTrigger per side (from the side's first section top to its last section bottom) maps progress through `packDiameters` to `transform: scale()` on `[data-pack]` (side b reverses progress).

- [ ] **Step 1: Write the failing tests** (`reels.test.ts`):

```ts
test("tier none never moves", () => {
  expect(stepReel({ angle: 30, omega: 500 }, 0.016, { velocity: 40, playing: true, tier: "none" })).toEqual({ angle: 30, omega: 0 });
});
test("playing settles at tape speed regardless of scroll", () => {
  let s = { angle: 0, omega: 0 };
  for (let i = 0; i < 300; i++) s = stepReel(s, 1 / 60, { velocity: 0, playing: true, tier: "full" });
  expect(s.omega).toBeCloseTo(PLAY_RPS * 360, 0);
});
test("scroll velocity spins the reel, then momentum decays to a stop", () => {
  let s = stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: 30, playing: false, tier: "full" });
  expect(s.omega).toBeGreaterThan(0);
  for (let i = 0; i < 240; i++) s = stepReel(s, 1 / 60, { velocity: 0, playing: false, tier: "full" });
  expect(Math.abs(s.omega)).toBeLessThan(1);
});
test("lite ignores scroll velocity", () => {
  expect(stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: 30, playing: false, tier: "lite" }).omega).toBe(0);
});
test("omega is clamped", () => {
  expect(stepReel({ angle: 0, omega: 0 }, 1 / 60, { velocity: 1e6, playing: false, tier: "full" }).omega).toBeLessThanOrEqual(MAX_OMEGA);
});
```
`e2e/reduced-motion-live.spec.ts` (rewrite `expectSettled`): with tier none, `[data-reel]` transforms do not change over 300 ms, `[data-pack]` transforms do not change while scrolling, no `canvas`, no element with inline `opacity: 0`, `html` has no `lenis` class.

- [ ] **Step 2: Run** `npx vitest run lib/motion/reels.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `stepReel`.** Target omega: playing → `PLAY_RPS * 360`; full tier and not playing → `velocity * 12` (Lenis `velocity` is px per frame); otherwise 0. Approach the target with time constant 0.35 s when the target is below the current magnitude (decay) and 0.12 s when above (spin-up). Clamp to `±MAX_OMEGA`. Angle wraps modulo 360. Tier none returns `{ angle, omega: 0 }`.
- [ ] **Step 4: Implement `useReelMotion`** and mount it. Run `npx vitest run lib/motion && npm run test:e2e -- reduced-motion-live`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: turn the reels with scroll and move the tape as you read`.

---

### Task 8: The flip to side B

**Files:**
- Create: `components/device/Flip.tsx` + `.module.css`
- Modify: `app/page.tsx` (pass `<Flip />` as `TapeBody`'s `flip`)
- Test: `components/device/Flip.test.tsx`, `e2e/flip.spec.ts`

**Interfaces:**
- Consumes: `DEVICE.flipFrames`, `Sprite` (Tasks 1, 5); `useMotionTier`; `playClunk` (Task 6).
- Produces: `<Flip />`: `<section id="flip" aria-label="Flip to side B">` 160vh tall containing a 100vh sticky stage. `full`: a `<canvas>` (sized to the stage, DPR-aware) draws frame `round(progress * (n - 1))` from preloaded `ImageBitmap`s; ScrollTrigger `start: "top top"`, `end: "bottom bottom"`, `scrub: true`, no `pin` (sticky does the holding). `lite`: two stacked `<img>` (frame 0 and the last frame) crossfading on progress. `none`: a single static image of the last frame (no canvas). `playClunk()` fires once when progress crosses 0.5 going down. Frames load lazily when the section is within one viewport.

- [ ] **Step 1: Write failing tests.** `Flip.test.tsx`: at tier `none` there is no `canvas` and one `img` of the last frame; the section has the accessible name "Flip to side B". `e2e/flip.spec.ts`: scrolling from `#people` to `#made` passes through `#flip`, the dock screen changes from `SIDE A` to `SIDE B`, and the dock key labels change to `made` and `on rotation`. (The no-side-B case is already covered by the `TapeBody` unit test from Task 4.)
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run components && npm run test:e2e -- flip reduced-motion-live`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: flip the tape to side B`.

---

### Task 9: The Spotify deck

**Files:**
- Create: `lib/spotify.ts`, `components/tracks/Mixtape.tsx` + `.module.css`
- Modify: `lib/playback.ts` (replace the Task 7 stub), `components/tracks/TapeBody.tsx` (mixtape track uses `Mixtape`), `components/device/HomeTape.tsx` (dock screen shows the playing song)
- Test: `lib/spotify.test.ts`, `lib/playback.test.ts`, `components/tracks/Mixtape.test.tsx`, `e2e/mixtape.spec.ts`

**Interfaces:**
- Produces (`lib/spotify.ts`):
  ```ts
  export const SPOTIFY_IFRAME_API = "https://open.spotify.com/embed/iframe-api/v1";
  export function spotifyUri(url: string): string;                 // track URL (with or without ?si) -> "spotify:track:<id>"
  export type PlaybackUpdate = { playingURI: string; isPaused: boolean; isBuffering: boolean; duration: number; position: number };
  export type EmbedController = { loadUri(uri: string): void; play(): void; pause(): void; togglePlay(): void; destroy(): void;
    addListener(e: "ready" | "playback_update" | "playback_started", cb: (ev: { data: any }) => void): void };
  export type SpotifyIFrameAPI = { createController(el: HTMLElement, opts: { uri: string; width?: string | number; height?: number }, cb: (c: EmbedController) => void): void };
  export function loadSpotifyApi(timeoutMs?: number): Promise<SpotifyIFrameAPI>;   // default 8000; singleton; rejects on script error or timeout
  ```
- Produces (`lib/playback.ts`):
  ```ts
  export type Playback = { status: "idle" | "loading" | "playing" | "paused" | "error"; song: number | null; position: number; duration: number };
  export function getPlayback(): Playback; export function subscribePlayback(l: () => void): () => void;
  export function setPlayback(p: Partial<Playback>): void; export function resetPlayback(): void;
  export const isPlaying = (p: Playback) => p.status === "playing";
  ```
- Produces: `<Mixtape songs={MixtapeSong[]} />`: an `<ol>` of rows (number, title, artist, note) each with a `<button>` "Play {title} on Spotify" and a plain `<a href={spotify}>Open in Spotify</a>`; a deck `<div data-deck>` that is empty until the first press; one line "Logged-out listeners hear a preview from Spotify."; a `role="status" aria-live="polite"` element announcing "Now playing: {title} by {artist}" once per song change. First press: `setPlayback({ status: "loading", song })`, `await loadSpotifyApi()`, `createController(deckEl, { uri, width: "100%", height: 152 }, ...)`, then `play()`. Later presses: `loadUri(uri)` then `play()`. `playback_update` → `setPlayback({ status: isPaused ? "paused" : "playing", position, duration })` (buffering counts as paused for the reels). Load failure → `status: "error"` and the row shows "Spotify didn't load. Open the song in Spotify instead." On unmount: `controller.destroy()` and `resetPlayback()`. If `play()` produces no `playback_update` with `isPaused: false` within 3 s, the deck shows "Press play in the Spotify player." (Safari autoplay).

- [ ] **Step 1: Write failing tests.** `spotify.test.ts`: `spotifyUri("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x") === "spotify:track:4uLU6hMCjMI75M1A2tKUQC"`; `loadSpotifyApi(50)` rejects when the injected script never calls `window.onSpotifyIframeApiReady`; a second call returns the same promise; the script tag is added only once. `Mixtape.test.tsx` mocks `@/lib/spotify` with `vi.mock`, keeping the real `spotifyUri` and replacing `loadSpotifyApi` with a fake API whose controller records `loadUri`/`play`/`destroy` calls and lets the test emit `playback_update` events:

```ts
test("nothing from Spotify loads before the first press", () => { render(<Mixtape songs={songs} />); expect(loadSpotifyApi).not.toHaveBeenCalled(); });
test("first press creates one controller, later presses reuse it", async () => { /* press song 1, then song 2: createController called once, loadUri called with song 2's uri */ });
test("playback updates drive the store", async () => { /* fire playback_update {isPaused:false, position:1000, duration:30000} -> getPlayback() status "playing", position 1000 */ });
test("a blocked script falls back to the plain link", async () => { /* loadSpotifyApi rejects -> status "error", text "Spotify didn't load", link "Open in Spotify" still present */ });
test("unmount destroys the controller and resets playback", async () => { /* unmount -> destroy called, getPlayback().status === "idle" */ });
test("every row has a plain Spotify link and a labelled play button", () => { /* getByRole("button", { name: "Play Fixture song 1 on Spotify" }); links href equal the fixture URLs */ });
```
`e2e/mixtape.spec.ts`: `page.route("https://open.spotify.com/embed/iframe-api/v1", ...)` fulfils a stub script defining `window.onSpotifyIframeApiReady({ createController })` whose controller emits `playback_update` with `isPaused: false` on `play()`; pressing "Play Fixture song 1 on Spotify" makes the dock screen show `Fixture song 1` and the `[data-reel]` transform change over 300 ms; navigating to an event page and back leaves the reels still; at a 390x844 viewport `document.documentElement.scrollWidth <= innerWidth` on the mixtape (the unbroken fixture title wraps). A second test routes the script to `abort()` and expects the error line within 9 s.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `loadSpotifyApi` sets `window.onSpotifyIframeApiReady` before appending the `<script src={SPOTIFY_IFRAME_API} async>`; rejects on the script's `error` event or after `timeoutMs`; caches the promise (and clears the cache on rejection so a later press can retry).
- [ ] **Step 4: Run** `npx vitest run lib components/tracks && npm run test:e2e -- mixtape`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: play the mixtape through Spotify and turn the reels with it`.

---

### Task 10: Power-on, screen flicker, section fade and the footer underside

**Files:**
- Create: `components/device/PowerOn.ts` (hook `usePowerOn(screenRef)`), `components/frame/Underside.tsx` + `.module.css`
- Modify: `components/device/Screen.tsx` (flicker on text change), `components/frame/Footer.tsx` (replace with `Underside`), `components/tracks/TrackSection.tsx` (fade-up once)
- Test: `components/frame/Underside.test.tsx`, `components/device/Screen.test.tsx`

**Interfaces:**
- Consumes: `SiteContent.about.toolbox`, `SiteContent.links` (Task 2), `Sprite`, `DEVICE.underside` (Tasks 1, 5).
- Produces: `<Underside toolbox links />`: the `underside` sprite with live text on the sticker (`DEVICE.underside.sticker`): heading "spec" and the toolbox as a list; beside it the links list (exactly the content's `links`), "Fonts: Archivo, Space Mono and Doto, from Google Fonts under the OFL.", and the `list` link. `usePowerOn`: once per session (`sessionStorage` key `side-a:powered`, wrapped in try/catch), the screen starts dark and types `SIDE A` one character per 80 ms after a 120 ms delay; skipped at tier `none` and when the URL has a hash. The device is visible and the keys usable throughout.

- [ ] **Step 1: Write failing tests.** `Underside.test.tsx`: renders the two seed links with their hrefs; renders the toolbox items; renders no `tel:` link; empty toolbox hides the spec list but keeps the links. `Screen.test.tsx`: at tier `none`, changing `lines` swaps text with no `data-flicker` attribute set; at tier `full`, `data-flicker` is set for one change and cleared (use fake timers, 120 ms).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Section fade-up: `useGSAP` per `TrackSection`, `from({ y: 8, opacity: 0 })` 400 ms `power2.out` with `scrollTrigger: { start: "top 85%", once: true }`; skipped at tier `none`; the element is visible at rest before hydration (from-states applied on mount only).
- [ ] **Step 4: Run** `npx vitest run components && npm run test:e2e -- structure reduced-motion-live accessibility`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: power on the screen and put the toolbox on the device's back`.

---

### Task 11: Event pages, 404 and social card

**Files:**
- Modify: `app/events/[slug]/page.tsx` + `.module.css` (no `ScrollFrame`, `InkBleed`, `seasonVars`; dock screen shows `LIVE` / `{place} {date}`), `app/layout.tsx` (`metadataBase` from `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`, `openGraph.images: ["/device/beauty.jpg"]`)
- Create: `app/not-found.tsx` + `.module.css`
- Test: `e2e/events.spec.ts`

**Interfaces:**
- Consumes: `Dock` (Task 6) rendered with `visible` always true and keys linking to `/#<track>`; `Underside` (Task 10).

- [ ] **Step 1: Rewrite `e2e/events.spec.ts`:** an event card on `/` links to `/events/<slug>`; the event page has the event name as `h1`, the dock screen text contains `LIVE` and the formatted date; "Back to events" returns to `/#events` with the heading focused; an unknown slug shows the 404 page with a link home and the beauty image (`alt=""`); `og:image` meta ends with `/device/beauty.jpg`.
- [ ] **Step 2: Run** `npm run test:e2e -- events`. Expected: FAIL.
- [ ] **Step 3: Implement.** The event page renders its photos as a simple column of `Photo`s (first photo as cover, `priority`), summary and story paragraphs, and the two nav links "Back to events" and "Track list". `TapeKeys` hrefs become `/#<id>` when not on `/` (pass an `hrefBase` prop: `"" | "/"`).
- [ ] **Step 4: Run** `npm run test:e2e -- events navigation`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: give each event a live-recording page and the device a 404`.

---

### Task 12: Polished art and the owner's approval

**Files:**
- Modify: `art/blender/side-a/device.py` (materials and modelling only; anchor objects and output names unchanged), `public/device/*` (re-rendered)
- Create: `.superpowers/art-review/index.html` (contact sheet, gitignored folder)
- Modify: `CLAUDE.md` (status: Side A built; decisions table rows for World, art pipeline, music; remove KanjiVG mentions)

- [ ] **Step 1: Improve the art.** Brushed aluminium: anisotropic Principled BSDF (`Anisotropic` 0.6, a tangent from a stretched noise along X) plus a 0.4 mm edge bevel catching the key light; keys: concave tops (a shallow boolean sphere cut), slightly rounded; knob: fine knurling on the side (array of 120 thin boxes, booleaned) visible in the 3/4 shot; screen bezel glass with a faint reflection; cassette shell with a printed paper label area and the A/B letter in Space Mono; tape packs with a faint radial striation. Keep every anchor and output name; `layout.json` must come out unchanged within 0.5%.
- [ ] **Step 2: Re-render** and run `npx vitest run lib/device`. Expected: PASS.
- [ ] **Step 3: Build the contact sheet** (every sprite on both `--table` colours, the 3/4 beauty shot, eight flip frames, and a screenshot of `/` at 1440x900 taken with `npm run dev:fixtures` and Playwright) and publish it as a private artifact. **Stop. Ask the owner to approve the art.** Apply requested changes and repeat until approved. Do not merge before approval.
- [ ] **Step 4: Update `CLAUDE.md`.** Commit `feat: polish the device art` and `docs: mark Side A as built` separately.

---

### Task 13: Verify the branch and open the PR

- [ ] **Step 1: Run everything from a clean state:** `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` (with `CONTENT_SOURCE` unset; the build must succeed on the near-empty seed). Expected: all pass; record counts.
- [ ] **Step 2: Check rules by grep:** no `kakejiku:` keys, no `KanjiVG`, no `three` or `webgl` imports, no `—` in `app/`, `components/`, `lib/`, no `tel:`.
- [ ] **Step 3: Review:** run `/review-pr` and the `experience-reviewer` agent on the branch diff; fix Critical and Important findings and re-run the affected tests.
- [ ] **Step 4: Push and open the PR** per the project `git-operations` skill (feature branch, no attribution lines), body with why, what was verified (counts), what is deliberately not in it (Supabase, admin, content), and which reviewers ran.
