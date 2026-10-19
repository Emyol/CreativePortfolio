# Side A: theme and site shape

Status: direction chosen by the owner on 2026-10-17 (option B on the
[Miel Portfolio Directions](https://claude.ai/artifact/5yzXxfNVJ98zRTdhfPoWpp) board); builder check
done and its open questions answered by the owner; awaiting owner approval of this
written spec.
Replaces: `2026-10-13-kakejiku-world-design.md` and every concept after it. Nothing of
Kakejiku's look, motion or Japanese layer carries over.
Scope: the visual World, site shape, device art, motion and the Spotify mixtape. The
Supabase project, photo hosting and the admin port stay separate specs (see **Out of
scope**).

## Intent

A personal site for peers, friends and collaborators. Personality first, no hiring
angle. The first build failed because it had **no owned art**: everything was CSS
gradients and procedural shapes, so it read as a template wearing a theme. Every
award-level reference the owner and I looked at has one owned object carrying the page.
This site's object is a **pocket tape player Miel built**, and the tape in it is **the
mixtape Miel would make you**.

Why this object: the one personal fact the professional site states is music ("Tempo,
arrangement, and the cut. Another way to think about parts that have to arrive on
time."), and Miel is someone who makes things. A device you operate says both without a
paragraph about either.

Success looks like this: a visitor presses play on a song Miel loves and the reels on
his device start turning; they scroll the whole tape because each track is worth
reaching; every word, photo and song on it came from Miel.

What the owner decided, which this spec preserves:

- Direction **B, "Side A"**, over Specimen and Photocopy.
- Miel has **no recordings of his own** and no time to make any. Music is a **mixtape
  of songs he loves**. His favourite artist is **NIKI (Nicole Zefanya)**; the actual
  track list comes from him later.
- **No generated music** (Higgsfield or otherwise). It would read as his work.
- Songs **play inside the site through Spotify's embed**, not by linking out.
- Still true from the project: desktop first, built in one to four weeks, no portrait in
  the hero, a menu and a smooth scroll at once.

## References

| Reference | Shows |
|---|---|
| [Miel Portfolio Directions](https://claude.ai/artifact/5yzXxfNVJ98zRTdhfPoWpp) | The three directions; B is chosen |
| `docs/concepts/2026-10-17/B-side-a-hero.png` | The concept render: the look to refine, not final art |
| `art/blender/concepts/src/concept_b.py` | The script that made it; the final device starts from it |
| `docs/inspiration/2026-10-17-new-direction.md` | Research board: teenage engineering (voice), Poolsuite (music as the interface), Lando Norris and NOTHIN' (one owned object), Zesiger (an honest no-3D path) |

## The World

The site is **one object on a table**: a pocket cassette player, brushed aluminium,
with a tape window, a small black OLED screen, one orange knob and four grey keys.
Industrial-design voice: small lowercase labels, plain words, nothing decorative that a
real device wouldn't have.

- **Palette** (tokens; values are the starting point, tune for contrast in planning):

  | Token | Value | Job |
  |---|---|---|
  | `--table` | `#E4E6E9` | Page background, a cool light grey (not cream) |
  | `--ink` | `#141518` | Text |
  | `--ink-muted` | `#5B5F68` | Secondary text |
  | `--alu` | `#D3D6DB` | Device-coloured surfaces in HTML (dock, plates) |
  | `--oled` | `#050506` | Screen backgrounds |
  | `--signal` | `#FF2E00` | **The only accent**: the knob, the playhead, focus, one CTA |
  | `--oled-text` | `#FF5A1F` | Lit text on the screen only |

  Dark theme (system preference, my call): `--table` becomes a near-black graphite, the
  device art is unchanged because it is rendered on a transparent background. The
  accent stays the same hue in both.
- **Typefaces**, one job each, all Google Fonts under the OFL, loaded with `next/font`:

  | Face | Job |
  |---|---|
  | Archivo (variable, use the width axis) | Display and body. Expanded width for section titles, normal width for running text |
  | Space Mono | Labels printed on the device, metadata (dates, venues, track numbers) |
  | Doto | Text **on the OLED screen** only. It is a dot-matrix face, so the screen reads as a screen |

- **Structure is real.** Track numbers are used because a tape's track list really is
  an order. No other numbering, no eyebrow labels, no decorative rules.

## Site shape

One long vertical page (the tape), a page per event, and a plain index.

1. **Hero: the device.** The player lies on the table, shot **straight down** so the
   reels are true circles. It fills most of the first viewport. Nothing else in the hero
   but the device; Miel's name is printed on it (`miel`, Space Mono, the way a maker
   marks their device). No portrait.
2. **The dock.** Once the hero scrolls away, the device's control strip (screen, knob,
   four keys, a small cassette window) becomes a fixed **dock** at the bottom of the
   viewport. It is the site navigation: a real `<nav>` of links styled as keys, plus the
   screen showing where you are. It stays for the rest of the page.
3. **Side A**, in this order. Each is a "track" with its number:

   | # | Track | Content (from `seed.json`) | Form |
   |---|---|---|---|
   | 01 | about | `about.letter`, `about.candid` | Liner notes: a few paragraphs set like a cassette J-card, with one taped-in candid photo if supplied |
   | 02 | events | `events` | "Live recordings": a list of events attended, newest first, each a card with photo, name, venue, date; each opens its event page |
   | 03 | mixtape | `music` | The mixtape: track list with Miel's note per song, and the Spotify deck (see **The mixtape**) |
   | 04 | people | `people` | "Featuring": credits set like an album's thank-you list |

4. **The flip.** After people, the tape flips to **side B**: a short scroll-scrubbed
   interstitial where a large render of the cassette turns over (pre-rendered frames).
   The dock screen changes from `SIDE A` to `SIDE B`.
5. **Side B:**

   | # | Track | Content | Form |
   |---|---|---|---|
   | 05 | made | `hobbies` | Things Miel does and makes, photo-led |
   | 06 | on rotation | `shelf` | Games, anime and manga he's into, as a compact list with notes |

6. **The back of the device (footer).** The device seen from underneath: rubber feet, a
   printed spec sticker. The **toolbox** (`about.toolbox`) is the spec list on the
   sticker, as live text. Beside it: the owner's links (GitHub and the professional
   site, see **Content model changes**) and the font credits.
7. **Event pages** at `/events/<slug>`: a "live recording" page. The dock screen shows
   `LIVE`, the venue and the date; the page holds the photos and story.
8. **Track list** at `/tracklist`: the plain index (replaces 目録 at `/mokuroku`, which
   should redirect). No motion, the whole content as simple lists. Linked from the skip
   link, the dock and the footer.

**Empty content stays hidden everywhere** (current behaviour): a track with no content
is not on the tape, is not in the dock, and the numbering closes up. The flip and side B
appear only if side B has content.

### Keys, knob and tracks (my call)

- The device has **four fixed keys**; the key recesses are baked into the plate render.
- The keys always show the **current side's** tracks: side A uses up to four, side B up
  to two. After the flip they relabel. A key with no track is a **blank key cap**: no
  label, `aria-hidden`, not focusable, no press animation. The plate never changes.
- **Hero keys are the navigation while the hero is in view**; the dock replaces them
  once it rises. Only one of the two is interactive at a time: the hidden one is
  `inert`. Both render from the same component and data.
- The **knob** has one detent per track on the current side, spread evenly over a 270°
  sweep; it points at the current track.
- The dock also holds three small plain controls beside the screen: **list** (links to
  `/tracklist`), **sound** and **keys** (the existing toggles). They are labelled text
  buttons, not keys.
- Shortcuts: **1** to the number of tracks on the current side, and **B** to flip.

## The device art

All device art is rendered in **Blender** from scripts in `art/blender/side-a/`, starting
from `art/blender/concepts/src/concept_b.py`. Renders are layered in the browser; there
is **no live 3D (no WebGL)** on the site.

Final art list (each rendered at 2× display size, transparent background, written as
AVIF with a WebP fallback into `public/device/`):

| Asset | Notes |
|---|---|
| Top-down plate | The body with recesses, labels area, screen bezel, empty tape window. Lit from the upper left |
| Contact shadow | Separate soft shadow pass so the device sits on either theme |
| Reel hub (×1, reused for both) | White hub with spokes, rotated in the browser |
| Tape pack | A dark brown disc, scaled in the browser to show tape moving reel to reel |
| Cassette shell, side A and side B labels | Swapped on the flip |
| Knob | Separate sprite, rotated in the browser to point at the current track |
| Keys, up and down states (×4) | Sprites; labels are HTML text, not baked |
| Flip sequence | About 24 frames of the cassette turning over, for the interstitial |
| Underside | For the footer; the sticker area left blank for HTML text |
| 3/4 beauty shot | The concept angle, for the social card (`og:image`) and the 404 page |

The OLED screen, the key labels and the sticker are **live HTML** laid over the renders,
so they are real, translatable, accessible text.

**Who renders, and when (my call):** the builder renders the art with headless Blender
(`blender -b --factory-startup -P <script>`; never `read_factory_settings` through the
Blender connection, it drops the connection). Art comes first in the plan: a **stand-in
set** is rendered early at the final dimensions and anchor points (plate, reel centres,
knob centre, key rects and screen rect recorded in one `public/device/layout.json`), and
components are built against it. The polished set replaces it file for file.

**Approval gate:** the polished art is shown to the owner as a contact sheet and
approved before the branch merges. Components don't wait for it. The concept render's known flaws to fix: the aluminium reads
flat grey (add brushed anisotropy and edge highlights), the keys are plain blocks (give
them a slight concave top), and the composition must be re-shot top-down.

## The mixtape

- Content: `music` becomes an ordered list of tracks, each `{ title, artist, spotify,
  note? }`, where `spotify` is an `https://open.spotify.com/track/<id>` URL (validated).
  At most **12** tracks (a short tape). No audio is hosted on the site.
- **The deck.** In the mixtape section, a "now playing" deck holds **one** Spotify embed.
  It is not on the page until a visitor first presses play. Then the site loads the
  Spotify iFrame API (`https://open.spotify.com/embed/iframe-api/v1`), creates one
  controller with `IFrameAPI.createController`, and later presses switch tracks with
  `controller.loadEntity(uri)` and `controller.play()`.
- **The reels follow the music.** `playback_update` gives `isPaused`, `isBuffering`,
  `position` and `duration`. While a song plays, the reels in the dock (and the hero, if
  in view) turn at a steady tape speed, the screen shows the title, artist and elapsed
  time, and the playhead bar follows `position / duration`. Paused or buffering: reels
  stop.
- **Before the embed loads**, every track row shows a play button labelled "Play on
  Spotify" and a plain link to the song on Spotify, so the page works if the script is
  blocked.
- Logged-out visitors usually hear a preview, not the full song. The deck says so in
  one plain line. Safari can block programmatic `play()`: if playback doesn't start
  after `play()`, the deck shows the embed's own play button for the visitor to press.
- The Spotify embed stays visible while it is in use; the site never hides it or
  restyles its inside.
- Privacy: no Spotify script, iframe or cookie loads until a visitor presses play.

## Motion system

> **Superseded in part (2026-10-18):** the entrance, the holds and arrivals, the 3D hero, flip
> and footer, and the event write-in are specified in
> `docs/superpowers/specs/2026-10-18-motion-design.md`, which replaces the "one signature move
> per component" rule below. What follows still describes the reels, packs, keys and knob.

Each component gets **one** signature move. Easing and durations follow the project's
taste rules (custom ease-out for entering, ease-in-out for on-screen movement, nothing
UI-facing over 300 ms except the scroll-scrubbed pieces).

| Component | Signature move |
|---|---|
| Reels | Turn with **scroll velocity** (from Lenis), with momentum that decays to a stop; turn at steady tape speed while Spotify plays. Transform only, driven from the GSAP ticker, never React state |
| Tape packs | The left pack shrinks and the right one grows with scroll progress through the side, so the tape physically moves as you read. Reversed on side B |
| Keys | Press sinks the key: sprite swaps to "down", `translateY(1px) scale(0.98)`, 100 ms; release 160 ms. Then the page scrolls to the track |
| Knob | Rotates to point at the current track, 280 ms ease-in-out |
| Screen | Text changes with a 120 ms dot-matrix flicker (opacity steps), no movement |
| Dock | Rises in when the hero leaves (240 ms ease-out), sinks out faster (160 ms) |
| Flip | Scroll-scrubbed frame sequence of the cassette turning over, pinned for a short distance (`start: "top top"`), releases normally |
| Power-on (once per session) | The screen lights and types `SIDE A`, about 600 ms total; the device is visible and usable from the first frame |
| Sections | Text and photos fade up 8 px once, as they enter. Nothing else |

**Stack:** keep Lenis for smooth scroll and GSAP with ScrollTrigger. Every GSAP setup
lives in `useGSAP` or `gsap.context` and reverts on unmount.

**Motion tiers** (keep `lib/motion/tier.ts` and `MotionProvider`):

- `full` (desktop): everything above.
- `lite` (phones): no flip scrubbing (a crossfade instead), no velocity reels (reels turn
  only while music plays), dock as a bottom bar.
- `none` (reduced motion, applied **live**): reels and tape packs are static, the knob
  snaps, keys don't animate, the flip is a straight swap, Lenis is destroyed and native
  scroll returns. Every key, link and the Spotify deck still work.

## Sound

**Off by default** (keep `lib/sound` and `SoundToggle`). When on, the keys make a short
mechanical click and the flip makes a tape clunk. Clips are tiny (under 20 KB each),
either recorded by Miel or generated as sound effects; generated **effects** are fine,
generated **music** is not. Sound never plays on scroll.

## Keyboard

Keys **1** to the number of tracks on the current side jump to those tracks (see **Keys,
knob and tracks**), and **B** flips to the other side; this reuses `lib/keys` and `KeysToggle` (WCAG 2.1.4: shortcuts
can be turned off). Every dock key is a focusable link with a visible focus ring in
`--signal`. The Spotify deck is reachable by Tab like any other control.

## Content model changes

`lib/content/schema.ts` and `seed.json`:

- `music`: replace `{ title, note?, link? }` (max 5) with `{ title, artist, spotify, note? }`
  (max 12), `spotify` validated as an open.spotify.com track URL.
- New `links`: an ordered list of `{ label, url }` (https URLs, validated, max 4) shown
  on the back of the device. The owner chose two on 2026-10-17; seed them as real
  content (both are facts from portfolioV2's `seed.json`):
  - `GitHub` → `https://github.com/Emyol`
  - `Professional site` → `https://project-miel.vercel.app`

  No email and no phone number.
- Everything else keeps its shape. `hobbies` and `shelf` move to side B; the shelf's
  `kind` stays `manga | game | anime`.
- Keep the fixtures workflow (`npm run dev:fixtures`), rewriting fixtures for the new
  music shape. Fixture songs must be **clearly fake** (for example "Fixture Song One"
  with a fixture Spotify URL); production builds still refuse fixtures. The first real
  track list waits for the owner.

## What happens to the existing code

Keep (they are World-independent): the content layer (`lib/content/*`), `lib/dates`,
`lib/motion/{tier,MotionProvider,storage,gsap,useInViewOnce,navigate}`, `SmoothScroll`,
`HashLinks`, `Photo`, `lib/keys`, `lib/sound`, the toggles, the accessibility, mobile,
reduced-motion-live and navigation e2e suites (rewritten against the new markup).

Remove: everything Kakejiku-specific (kanji and KanjiVG data and credit, ink, brush,
seals, seasons, weather, mountains, the seal rail, the Konami crane, Japanese glossary,
the `kakejiku:` storage-key prefix, which becomes `side-a:`). The planner decides file
by file; when in doubt, delete rather than adapt.

## Accessibility

- Skip links to main content and to `/tracklist`. One `h1` (Miel's name, visually the
  print on the device), one `h2` per track.
- The device art is decorative (`alt=""`); everything it says is also live text.
- The dock is a `<nav aria-label="Tape">`; the current track is marked
  `aria-current="true"`.
- The screen's changing text is not announced on every scroll. Only the "now playing"
  title is in a polite live region, once per track change.
- Contrast: body text meets WCAG AA on `--table` in both themes; `--signal` is used for
  non-text marks and large text only unless it passes AA where used.
- No scroll-jacking that traps keyboard or assistive scrolling; the flip's pin releases
  normally and can be passed with the keyboard.

## Content rules this World must respect

- Every event, song, note, person, photo and title comes from the owner via
  `content-inbox/` (or the admin later). The concept render's labels (`miel model 01`,
  `SIDE A`, `01 about`) are UI, not claims.
- Songs are songs Miel **loves**, by their real artists, played through Spotify. Never
  present a song as Miel's work.
- Events are events Miel **attended**.
- No phone number anywhere. Toolbox limited to `PROFESSIONAL_STACK`.

## Licensing

Fonts: Archivo, Space Mono and Doto from Google Fonts under the OFL. The Blender scripts,
renders and `.blend` files are the owner's. Spotify embeds are used as Spotify provides
them, unmodified. The KanjiVG credit is removed with the kanji.

## To verify in planning

- Next.js 16: read `node_modules/next/dist/docs/` for `next/font` (variable axes),
  `next/image` with AVIF sources (or plain `<picture>`), redirects, and View Transitions
  if used for the event-card to event-page move.
- The Spotify iFrame API in a React client component under the App Router: one
  controller for the whole page, cleanup with `controller.destroy()` on unmount, and
  behaviour when the visitor navigates to an event page and back (music should keep
  playing only if the deck stays mounted; decide and test).
- Frame-sequence weight for the flip: target under 1.5 MB for all frames together.
- Lenis velocity sampling for the reels without re-rendering React.

## Out of scope

- Supabase project, photo hosting, domain and hosting.
- The admin editor port (its own spec, plan and build).
- Mobile polish beyond "works and reads well".
- Writing any content. The site launches with whatever the owner has supplied; empty
  tracks stay hidden.

## Section style: Screen (decided by the owner after the prototype, 2026-10-17)

The [Side A Prototype](https://claude.ai/artifact/UYDs7e7NN7qoa6BUYJxu9x) (branch
`prototype/side-a`, throwaway) compared three treatments for track content; the owner
chose **B, Screen**. Each track's content sits in a dark panel that reads as an
extension of the device's OLED: `--oled` background with an inset 3 px border in a
lighter graphite, rounded 14 px. The track title sits just above the panel in **Doto**
at display size in `--oled-text` with a soft glow (`text-shadow` of the same colour);
its track number stays Space Mono in `--ink-muted`. Inside the panel, body text is light
grey (about `#E9E9E9`, muted text about `#9A9EA6`), photos sit on the dark ground, and
dividers are a dark graphite. The table (`--table`) stays the page background between
panels, so the page alternates table and screen. Contrast inside panels must still meet
WCAG AA.

## Decided by the owner after the builder check (2026-10-17)

- Hero shot **straight down** (not the concept's 3/4 angle) so reels rotate as flat
  images; the 3/4 shot becomes the social card and the 404 art.
- Footer links: **GitHub** and the **professional site**.

## Calls I made (owner to check)

- No WebGL: layered Blender renders only.
- Four fixed keys that relabel per side, blank caps for unused keys, hero keys and dock
  never both interactive (see **Keys, knob and tracks**).
- The builder renders stand-in art first and builds against it; the owner approves the
  polished art before merge.
- Side B holds hobbies ("made") and the shelf ("on rotation"); the toolbox lives on the
  device's underside in the footer.
- Twelve-track cap on the mixtape.
- Dark theme follows the system setting.
- Typefaces: Archivo, Space Mono, Doto.
- `/mokuroku` becomes `/tracklist` with a redirect.
