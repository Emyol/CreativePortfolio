# Side A v2: the desk

Status: approved by the owner on 2026-10-28. Supersedes the scroll page of
`2026-10-17-side-a-design.md` (site shape, sections, flip, dock) and most of
`2026-10-18-motion-design.md` (entrance, holds, hero to dock, flip, section arrivals). What those
specs say about content rules, the mixtape's Spotify deck, sound, the 3D player's fallbacks and
accessibility still holds unless this one says otherwise.

The approved prototype is
`.superpowers/brainstorm/815-1793074112/content/tape-3d-events.html` (published privately at
https://claude.ai/artifact/CPwFWMgURZA6uXCh5sY5Pf). Its critique, which this design answers, is
`.impeccable/critique/2026-10-28T15-20-32Z__instorm-815-1793074112-content-tape-3d-events-html.md`
(17/36). The prototype is the reference for feel, not for code: it is a single throwaway file.

## Intent

v1 works but the owner finds it plain. In his words: it "lacks background", the assets feel "too
generated", it lacks "features/visual candy", and he does not want "a straightforward scroll" but
"a novel approach" to moving through the site. For v2 he asked to "go all out", then, approving the
prototype: "go full/crazy on the design and use all the skills that are necessary for design, and
polish the navigation."

So v2 turns the site from a page you scroll into **a desk you play**. The tapes are the sections.
You pick one up, it drops into the player, and its J-card unfolds with that section inside, each
section built as a different piece of digital/radio kit. The player itself is the navigation.

Audience and rules are unchanged: peers, friends and collaborators, personality first, no hiring
angle, never invented content.

## Decided by the owner

During brainstorming, 2026-10-26 to 2026-10-28:

| Decision | Choice |
|---|---|
| Background | **The dot field**: a dot-matrix field behind everything that lights toward the cursor, takes the loaded tape's colour, ripples on insert and moves with playback |
| Navigation | **Load a tape**: no page scroll at the top level. Six tapes on a desk, one per track; loading one opens its section |
| 3D | The player, the tapes and the section objects are modelled; mobile must work well |
| Desk | Tapes scattered, not in a grid; you can throw them (they slide, spin, collide), pick one up to read its back label, and a lamp cord switches to night with a pool of light that follows the cursor |
| Style of the sections | **Digital/radio**, each section **unique** |
| 01 about | **Voice memo**: the letter plays like a memo, words lighting up as they are "said", a waveform you scrub |
| 02 events | **Screen menu** (prototype variant E): the player's own orange dot screen grown large, a list you drive like the device, dot-matrix photos, Enter opens a "LIVE REC" view |
| 03 mixtape | Keeps its music player and Spotify deck (the owner is happy with it); restyled to sit in the new world |
| 04 people | **Walkie-talkie**: one person per channel; hold to listen and their note comes through, ending "over." |
| 05 made | **Camera playback**: things made as photos on a camera's review screen, with OSD, index view and zoom |
| 06 on rotation | **Teletext**: page numbers, rolling page counter, coloured fastext keys, notes cycling through sub-pages |
| J-card (after critique) | **Stays a printed paper J-card**: left flap the tracklist (also nav), centre the section's device as a physical object, right panel the text. Dark only where a real screen is |
| First view | **The desk; the visitor picks.** A shared link to a track skips straight into it |
| Switching | **Full ritual on the first insert of a visit, then one motion of 1.2 s or less**, interruptible |
| Player keys | **Six keys, one per track** (the Blender model changes from four) |
| Section devices (after the builder check) | **Rendered images with live screens**: modelled in Blender, shown as layered renders with real DOM text and screens set into them. Only the player and tapes are real-time 3D |
| Night | **One night, made of light.** The lamp's night mode is the only dark mode: the system dark preference starts a visit in night, the cord toggles it, and the choice is remembered. v1's graphite theme goes. No second set of artwork |
| Extras | **All four**: pencil rewind, stickers on the player, a hidden Side C tape, idle shuffle (see **Extras**) |

## Goals

- The first view is the desk, and it is unmistakably this site: the real player, six labelled tapes,
  the dot field, physical light.
- Every section is a different object you operate, not a card with a widget in it.
- Navigation a first-timer understands in five seconds and a power user can fly through: the player
  is the map, every track and event has a URL, Back does what you expect, keys 1 to 6 jump.
- It is a pleasure on a phone held in one hand.
- It meets the existing accessibility bar: keyboard, screen readers, visible focus, contrast and
  `prefers-reduced-motion` that works live.

## Non-goals

- New content types. The content model already holds everything (see **Content**); the one addition
  is the optional `sideC` block for the hidden tape (see **Extras**).
- Real recorded audio for the voice memo (possible later if the owner records it).
- A guestbook or anything visitors write.
- Changes to the admin beyond its preview showing the new desk.

## Anti-goals (a failure even if it works)

- Five sections that look like one template with different widgets (the prototype's main fault).
- A gimmick that hides the content: a letter you can't read until it "plays", an event you can't
  reach without a ritual, a person's note you can only see by holding a button with a mouse.
- Waiting: any repeated animation a visitor can't skip or interrupt.
- A desk a keyboard or screen-reader user can't use.
- Invented content of any kind. Sample text exists only in fixtures.
- The common AI looks: warm cream paper with terracotta, neon-on-black everywhere, purple gradients.
  Paper here is cool card stock; dark appears only as real screens.

## Site shape

### Routes

| Route | What it shows |
|---|---|
| `/` | The desk. No tape loaded. The player's screen says `PICK A TAPE` |
| `/about`, `/events`, `/mixtape`, `/people`, `/made`, `/on-rotation` | The same desk with that tape loaded and its J-card open. Server-rendered with the section's real content, so a shared link, a crawler and a no-JS visitor all get the content |
| `/events/<slug>` | An event, opened from the Events screen (see **02 events**) |
| `/tracklist` | The plain index, unchanged in role: every track as simple lists, no motion |
| `/admin`, `/admin/preview` | Unchanged, except the preview renders the new desk with the draft |

Empty tracks stay off the desk (no tape, a blank key, the route 404s); see **Fixed numbering**.
Old hash links (`/#events` and the like) redirect to the track's route.

The desk and the 3D scene persist across these routes (one shared layout; navigating between tracks
must not remount the renderer). Moving between routes animates: Back from a track ejects, Forward
re-inserts. A direct load of a track route skips the desk: the tape is already in, the J-card
already open, with only a short settle (see **Timing**). Read the relevant guides in
`node_modules/next/dist/docs/` before writing the layout and routing; this Next.js has breaking
changes.

### The three states

1. **Desk.** The player sits right of centre at full size, the six tapes are scattered to its left,
   the lamp cord hangs top right. Hovering a tape lifts it and the screen cues it (`CUE 03 mixtape`).
2. **Deck.** A tape is in. The 3D view eases back and shrinks to the lower left, still live (reels
   turning, screen and LED working, keys and knob usable). The J-card fills the rest.
3. **Inside a section.** Some devices have a second level (an opened event, a teletext page, a
   camera's zoomed photo, a received message). Esc or Back steps out one level at a time.

### The player is the navigation

- **Six keys**, printed `about events mixtape people made rotation` (live text on the plate, as
  today), one per track. A press loads that track. The key of the playing track stays latched down.
- **Fixed numbering.** With printed keys, a track's number and key never move: 03 is always mixtape
  (key 3, shortcut 3, `03` on labels and the screen). An empty track has no tape on the desk and no
  route (404), and its key is printed blank and does nothing. This replaces v1's closing-up of numbers
  (`lib/tape.ts` and its tests change accordingly).
- **Eject** is a seventh, smaller key on the plate, printed `⏏`. The keys' size and spacing are
  re-laid out in Blender to fit seven (each still at least 44 px as a touch target in the corner).
- **The knob** moves through whatever the open device lists: events in the menu, channels on the
  walkie, photos on the camera, pages on teletext, the playhead in the memo. Drag it, wheel over it,
  or use ↑/↓. It has detents per item and a short wiggle the first time a device that uses it opens.
- **The screen** always says where you are, in words: `02 EVENTS` / `> 03 OF 07`, `CH 02 · PERSON B`,
  `P601 SAMPLE MANGA`, `▶ 00:41`.
- **Eject** (the ⏏ key) returns to the desk.
- In the deck state the corner player is big enough to hit its keys: at least 44 px per key on
  touch, with the hit areas as real DOM buttons over the canvas.
- A DOM transport mirrors the player for clarity and access: `◀◀ 01 about` · `⏏` · `03 mixtape ▶▶`
  (the neighbours named), plus sound and night. It never covers content.

### One control grammar for every device

| Input | Meaning everywhere |
|---|---|
| Knob, ↑/↓, wheel over the device | Move through the device's items |
| Enter / Space / click an item | Open it |
| Esc / Backspace / browser Back | Back one level; at the top level of a section, eject to the desk |
| ◀◀ / ▶▶, ←/→ on the J-card frame | Previous / next track |
| 1 to 6 | Load that track (the existing shortcut toggle, WCAG 2.1.4, still turns these off) |
| Tab | Real controls in visual order; nothing invisible is focusable |

Device-specific gestures are additions, never replacements: hold-to-listen also works as press
once, teletext digits are a shortcut beside the coloured keys and the page list, pinch or drag on the
camera beside its zoom buttons.

### First visit and discoverability

- The desk shows everything it can do without reading: the screen says `PICK A TAPE`, one tape
  (01 about) gives a small nudge after two idle seconds, hovering lifts and cues.
- A one-line hint under the player names the less obvious toys (`drag to throw · double-click to
  read the back · pull the cord`) until the first tape is loaded, then never again that visit
  (remembered per browser, wrapped in try/catch).
- Picking up a tape (inspect) has a visible affordance on hover/focus, not only a double-click.
- Played tapes remember: after a tape has been played this visit, its label shows a small play
  count tick and it returns to the desk slightly worn. A quiet closing beat when you come back.

### Timing

- **First insert of a visit**: about 2.2 s from click to readable content: the tape flies to the
  slot (0.55 s), drops with the clunk and the deck dip, the LED lights, the screen counts `LOADING`
  briefly (0.4 s), the J-card unfolds (0.7 s).
- **Every later switch**: one motion, at most 1.2 s, with content readable by about 0.6 s: the
  current tape lifts out as the next drops in, no loading count, the J-card swaps its print without
  re-folding.
- **Interruptible everywhere**: clicking another tape or key mid-insert retargets from where the tape
  is; Esc mid-unfold folds back from the current angle; nothing locks input. Springs follow
  `apple-design`: critically damped (damping 1.0, response about 0.4) by default, a little bounce
  (about 0.8) only after a throw or flick. A thrown tape keeps the release velocity.
- **Direct route load**: the tape is already seated; the J-card settles in 0.3 s.

## The J-card

A real cassette J-card is a folded, printed card. Here it stays one:

- **Paper**: a cool white card stock (not cream), with a faint print texture and a soft fold crease
  between panels. Printed in **two inks**: near-black and the track's colour (the tape shell colours
  from the prototype: about orange, events blue, mixtape pink, people green, made ochre, rotation
  violet, tuned for contrast on paper). One accent per track; the screen orange belongs to screens.
- **Left flap, the spine and tracklist**: the six tracks as a printed list with the current one
  marked, each a link (this is also the nav, and the `<nav>` for screen readers). Side A / side B
  printed as on a real J-card. On phones it collapses to the spine.
- **Centre, the device**: the section's object, physically drawn (see **Sections**). Its screen is
  live DOM, dark, the only dark surface in the card.
- **Right panel, the text**: the section's words set as liner notes, in the print face: the letter,
  the selected event's summary, the selected person's relation, a hobby's note, a shelf note.
- **Unfold**: the first insert of a visit unfolds the panels from the tape like a real J-card. Later
  switches reprint in place (a quick ink wipe in the new colour). Eject folds back along the same
  path.
- **Type on paper**: a print face, not the screen's mono. Archivo (already loaded, width axis) for
  display at a wide setting, a mono for labels; Doto only on screens.

## Sections

Every device below is a physical object: modelled in Blender in the same style as the player
(`art/blender/`), rendered as layered images (light and night variants), with its screen and every
label as live DOM text in cut-outs, the way the v1 sprite device works. Each one has its own sound
set (off by default, see **Sound**). Each lists its items as real semantic elements under the art.

### 01 about: voice memo

- **Object**: a small pocket dictaphone with a slot screen showing the waveform, a red record lamp
  and play / rewind keys. The candid photo sits on its screen's "caller" area as the dot-matrix
  photo from v1 (`DotPhoto`, with the admin's dots settings).
- **Behaviour**: on open it plays: the playhead moves at reading pace, the word being "said" is lit in
  the track ink, the waveform fills. Drag the waveform or turn the knob to scrub; click any word to
  play from there; Space toggles play.
- **The letter is always fully readable** at body contrast. Playback only adds a highlight; nothing
  is dimmed below 4.5:1. Under reduced motion it does not autoplay.
- The right panel holds the signature and the toolbox line (`about.toolbox`) as printed credits.

### 02 events: screen menu

- **Object**: the player's own screen, grown into a large OLED panel in a slim aluminium bezel,
  orange dots on black with faint scanlines.
- **List**: one row per event, newest first: number, name, a long name stepping across as on the
  player (`lib/motion/marquee`). Knob or ↑/↓ moves the cursor; hover moves it too. The preview area
  shows the event's first photo dithered into orange dots (`lib/dotPhoto`), the date and the place.
- **Enter opens** `/events/<slug>`: the screen wipes to a `● LIVE REC` view with a running clock,
  the dithered photo and the summary; the right paper panel shows the story; an `open the full
  recording` action opens the event's photos at full colour as prints dealt onto the paper (the v1
  photo morph via `<ViewTransition>`). Esc or Back returns to the list with the same row selected.
- Semantics: a `listbox` with `option`s, or a list of links with `aria-current`; the opened event is
  a page with its own `h1`.

### 03 mixtape: the music player, restyled

- Function unchanged from v1 (the Spotify iFrame deck, max 12 songs, nothing loads before play,
  plain links before the embed). The reels of the loaded tape follow the music.
- **Object**: the J-card itself is the star here: the songs are printed on it as a real mixtape
  track list (A1, A2 … B1), with Miel's note per song as handwritten-style marginalia set in the print
  face. The centre holds the deck: the Spotify embed in a simple player frame with the now-playing
  line on a small screen.
- While a song plays the dot field moves with it (a decorative visualiser driven by play state and
  position, not by audio analysis, which the embed doesn't allow).

### 04 people: walkie-talkie

- **Object**: a handheld radio with an antenna, a channel LCD, a speaker grille and a big
  push-to-talk key on its side.
- **Channels**: one person per channel. Knob, ↑/↓ or the preset keys change channel, with a burst of
  squelch.
- **Listening**: hold the talk key (or press it once with the keyboard or a tap) and the note comes
  through letter by letter with the level meter moving, ending `— over.` and the person's link.
  Releasing early keeps what came through; pressing again finishes it. A person without a note shows
  `— no message on this channel —` (UI text, not a claim about them). The full note is also in the
  right panel and in the accessible list, so holding is never required to read it.

### 05 made: camera playback

- **Object**: the back of a compact digital camera: the review screen, a four-way pad, zoom rocker,
  playback and display buttons, a strap lug.
- **Screen**: one photo at a time with the OSD (file number `100-0002`, battery, `2/5`, the name and
  note). The pad or knob flips; the index button shows a thumbnail grid; the zoom rocker, wheel or
  pinch zooms, drag pans. A hobby without a photo shows `NO IMAGE` with its name. A link shows as an
  OSD item and in the right panel.

### 06 on rotation: teletext

- **Object**: a small CRT television with a curved screen, rounded corners, a slight glow and its
  remote control beside it (number pad and the four coloured keys).
- **Pages**: `P600` is the index (title in double height, every item with its page number and kind
  in teletext colours); `P601` onwards one per item. Typing a number rolls the header's page counter
  before the page appears; the coloured keys go prev / next / more / index. A note with several
  paragraphs becomes sub-pages `1/3`, `2/3` that advance on their own every 7 s with a pause control
  (WCAG 2.2.2), and by hand.
- The teletext palette (pure cyan, yellow, magenta, green on black) is deliberate: it is the
  broadcast standard, used only inside this screen. A teletext-style face (Bedstead, public domain;
  verify the licence) self-hosted for the screen only.

## The desk, pushed further

- **Light**: soft key light with real contact shadows; the lamp gives night mode a warm pool that
  follows the cursor, the player's screen and LED glow, the tapes' labels catch the light.
- **Night** is lighting, not a theme. The room and desk darken and the lamp pool follows the
  pointer (on touch, it rests over the player). The J-card is paper under the lamp: it takes a warm
  light tint but keeps full text contrast (4.5:1 checked in night too); device renders get a CSS
  light overlay, not separate night renders. `prefers-color-scheme: dark` starts a visit in night;
  the cord (and a night key in the transport) toggles it; the choice is remembered per browser
  (try/catch). Switching eases the light over about 0.3 s, never an abrupt flash.
- **The dot field** stays the background in every state. It tints to the loaded tape, ripples on
  insert, breathes slowly while something plays, and in night mode lights only near the lamp.
- **Tapes**: clones of the player's own cassette with printed labels and B-side labels (live data
  from content: the B-side lists what's on the track, e.g. the event count and latest date). Throw
  physics as prototyped, plus a gentle bounce off the desk edges and a visible pile that never hides
  a tape completely (tapes nudge apart when they would cover each other).
- **The underside**: the player can be turned over on the desk (a `turn over` control, and dragging
  the player) to show the v1 underside: spec sticker with the toolbox, the owner's links and the
  font credits, as in v1's footer. The links also appear in `/tracklist`.
- **Sound** (off by default; `lib/sound`): tape clunk, key click, knob detents, squelch and roger
  beep, camera shutter on flip, teletext page tick, memo click, lamp switch. All tiny generated
  effects, never music, and every sound fires on the same frame as its visual.

## Extras

Toys, not navigation: each is optional to use, never blocks anything, and is off under reduced
motion unless noted.

- **Pencil rewind.** A pencil lies on the desk. Pick it up (click or drag) and the cursor becomes the
  pencil. Circling it over the loaded tape's reels (in the corner player, or the player on the desk)
  winds them: the reels follow the circling with a ratchet sound. In About it scrubs the memo backward
  or forward with the winding; elsewhere it is a pure toy. Put it back by clicking the desk or Esc. No
  keyboard path needed (a pure toy, as the v1 motion spec allows); hidden on phones.
- **Stickers.** A sticker sheet sits on the desk. Peel one (drag) and stick it anywhere on the player,
  where it stays at that spot next visit (per browser, try/catch; a `peel all off` on the sheet). The
  designs are decorative (track numbers, side marks, small shapes in the track inks), never claims.
  Under reduced motion peeling is a pick-and-place without the curl. Keyboard: a sticker can be
  picked from the sheet with Enter and placed in one of a few preset spots.
- **Hidden Side C tape.** A seventh tape that is not on the desk. It appears when found: **typing
  `c` three times on the desk** (keyboard) or **pressing the player's eject key three times with no
  tape in** (pointer and touch). It drops out of the player's slot with a surprise sound, then loads
  like any tape into its own J-card. **Its content comes from the owner only**: an optional `sideC`
  block in the content (`title`, `note`, optional `photo`, edited in the admin). Without it there is
  no Side C and the triggers do nothing. Route `/side-c`, not linked anywhere and excluded from the
  tracklist and the sitemap. This is the one schema addition in v2.
- **Idle shuffle.** After 45 s with no input **on the desk** (never while a section is open), the
  tapes drift into a new arrangement and one lifts with its cue on the screen (`CUE 04 people`)
  inviting a click. It never loads a tape by itself and stops on any input. Off under reduced motion.

## Phones

- **Layout**: the player at the top at reduced size; under it a row of the six tapes you swipe
  (scroll-snap) with a `2/6`-style counter; tapping one loads it.
- **The J-card becomes a sheet** rising from the bottom with three detents (peek, half, full),
  dragged by its handle or its top edge, with momentum projection and rubber-banding (`apple-design`
  sections 5 to 9). Dragging it down reveals the player; flicking it down past half ejects.
- **The player's six keys dock as a bottom tab bar** in the thumb zone when a tape is in, and the
  sheet's content gets padding so nothing sits under the bar. Nothing fixed ever overlaps a control.
- Device art is laid out for the phone: the left flap collapses to the spine; devices fill the width;
  teletext's remote sits under the screen with every key reachable; the talk key is large.
- Pick-up (inspect) is a visible button on the raised tape, not a long press.
- 3D runs at the `lite` tier as today (lower pixel ratio, no cursor effects); falls back to the
  sprite device where 3D can't run, as today.
- Follow `mobile-native` (tap highlight, `100dvh`, safe areas, no pull-to-refresh fights).

## Reduced motion (live, switching mid-visit)

- No throws, no flight: tapes stay where they are, loading is a short cross-fade of the tape into the
  slot and of the J-card in.
- The J-card appears without the fold; switching is a cross-fade.
- The memo does not autoplay; teletext sub-pages do not auto-advance; marquees show the full text
  wrapped instead of stepping (or follow the v1 trade-off already recorded in the motion spec).
- The dot field holds still (no breathing, no ripple), lit only near the pointer.
- Every interaction still works, just without movement.

## Accessibility

- One `h1` (Miel's name, as the print on the player). Each track route has its section `h2` as the
  J-card's title. Skip links to the J-card and to `/tracklist`.
- **The desk is fully operable by keyboard**: each tape is a real link (`<a href="/events">`)
  positioned over its 3D tape and kept in sync with it, focusable in a sensible order, with a visible
  focus ring that the 3D echoes (the tape lifts). The six player keys are the same links.
- When a tape loads, focus moves to the J-card heading; after eject it returns to that tape.
- The J-card is the `main` region. During the unfold, the duplicate panels the fold animation needs
  are `aria-hidden` and `inert`.
- Every device has a semantic structure under its art: lists, buttons with names, live regions only
  for real changes (the received message, the opened event, the loaded track), once.
- Contrast: body text 4.5:1 on paper and on screens; the dim screen hints in the prototype (2.5:1)
  are not acceptable. Focus visible in the track ink on paper and in white on screens.
- Hold-to-listen, drag, pinch, throw and knob all have a single-pointer or keyboard alternative
  (WCAG 2.5.1, 2.5.7).

## Content

One schema addition: an optional `sideC: { title, note, photo? }` with its admin section (see
**Extras**). Otherwise each section reads what it already has:

| Section | Fields used |
|---|---|
| about | `about.letter`, `about.candid`, `about.dots`, `about.toolbox` |
| events | `events[]`: `slug, name, date, place?, summary, story, photos` |
| mixtape | `music[]`: `title, artist, spotify, note?` |
| people | `people[]`: `name, relation, note?, link?` |
| made | `hobbies[]`: `name, note, photo?, link?` |
| on rotation | `shelf[]`: `title, kind, note` (paragraphs become sub-pages) |
| underside | `about.toolbox`, `links[]` |

All UI words (`PICK A TAPE`, `— over.`, `NO IMAGE`, `not on this service`) are interface, not claims.
Every rule in the project's CLAUDE.md content rules applies. `npm run dev:fixtures` must exercise
every device with worst-case fixtures (long names, missing photos, a person with no note, a one-page
and a five-page shelf note, empty tracks).

## Art and 3D

- **Blender** (`art/blender/side-a/device.py` and new files beside it):
  - the player gets **six keys** instead of four (layout, labels, sprites, `layout.json` and the GLB
    re-exported; `lib/tape.ts` key and knob logic updated to six);
  - four new device objects: dictaphone, walkie-talkie, camera back, CRT with remote; plus the
    events OLED bezel and the mixtape deck frame. Same modelling language and materials as the
    player (brushed aluminium, rubber, printed labels as live text);
  - rendered as layered images (light and night), plus `layout.json`-style coordinates for each
    device's live screen and key cut-outs.
- **Real-time 3D** stays for the player and the tapes in the one shared renderer (desk and corner).
  The section devices are images with live DOM screens, not real-time 3D: lighter on phones, and
  their text stays real text.
- Fallbacks as today: the sprite player where 3D can't run, never as a placeholder before the 3D.
  Without 3D the tapes are drawn sprites with the same DOM links.

## Performance

- Desk to interactive on a mid laptop under 2.5 s on a warm cache; the GLB already meshopt-compressed.
- Device art lazy-loads per track (AVIF/WebP), preloaded on tape hover/focus.
- One renderer, paused when the tab is hidden; the dot field's canvas capped at the device pixel
  ratio of the 3D tier and paused under reduced motion.
- No layout shift when the J-card swaps; the sheet and the corner player have reserved geometry.

## What happens to the existing code

- **Replaced**: the scroll page (`TapePage`'s composition, `TapeBody`, `TrackSection` and the
  section components' scroll arrivals), the entrance, the hero-to-dock, holds (`useHold`), the flip
  interstitial, Lenis smooth scroll on the home page, the dock as a scroll nav.
- **Kept and reused**: `Screen` and `lib/motion/marquee`, `screenTexture`, `lib/three/*` (loader,
  materials, stage, support), `Underside` content, `lib/sound`, the keys toggle, the Spotify playback
  (`lib/playback`, `lib/spotify`), `DotPhoto` and `lib/dotPhoto`, the content layer and admin, the
  tracklist, the event page's content and its photo morph, `lib/tape` (extended to six keys).
- The admin preview renders the new desk from the draft.

## Build phases (for the plan)

**v1 stays live until v2 is whole.** v2 is built on a long-lived integration branch `v2`; each phase
is its own branch and PR into `v2`, reviewed on its Vercel preview. `v2` merges to `main` (with the
owner's go-ahead, as every merge) only when every section works, so the live site never shows a desk
over missing sections. The v1 scroll page, `useHold`, the flip and Lenis are deleted in the phase that
replaces them, on `v2`.

**Art has review points.** The owner approves each device's render (a still, then the layered
version) before it is wired in. Code never waits on art: phases 2 and 3 build against stand-in images
that honour the same layout contract (`layout.json`-style coordinates for the screen and key
cut-outs), and real renders drop in when approved.

The plan should split this into these phases:

1. **Art**: six-key player and GLB; the five device objects and their layouts.
2. **Desk and navigation**: routes and the persistent layout, the desk (tapes, physics, lamp, dot
   field), DOM tape links, the deck state, the J-card shell with left flap and right panel, the
   transport, the control grammar, timing and interruption, reduced motion. Events ships here first
   as the reference device.
3. **Devices**: about, people, made, on rotation, the mixtape restyle, the event page in the new world.
4. **Phones**: the sheet, the docked keys, device layouts.
5. **Finish**: sound set, underside on the desk, worn tapes, the extras (pencil rewind, stickers,
   Side C with its schema and admin field, idle shuffle), the polish pass, then a re-run of the
   critique.

## Skills for each phase

| Phase | Skills |
|---|---|
| Art direction and the J-card print | `impeccable` (`overdrive`, `typeset`, `colorize`), `design-taste-frontend`, `emil-design-eng` |
| Motion and gestures | `animate`, `gsap-skills`, `apple-design` (springs, velocity handoff, projection, rubber-banding), `review-animations` |
| Delight and sound | `impeccable delight`, `find-animation-opportunities` |
| Phones | `mobile-native`, `impeccable adapt` |
| Harden | `break-ui` (worst-case content in every device), `design:accessibility-review`, `impeccable audit` and `harden` |
| Finish | `impeccable polish`, then `impeccable critique` (target: 32/36 or better), `experience-reviewer` and `/review-pr` before each PR |
| Build discipline | `superpowers:test-driven-development`, `superpowers:verification-before-completion` |

## Testing

- Unit: the navigation state (route ↔ desk/deck/inside, the Esc ladder, the first-insert flag,
  interruption retargets), six-key logic in `lib/tape`, each device's item model (events order,
  channel wrap, sub-page split, camera index), marquee and dot photo as today.
- End to end (Playwright on the GPU as today): keyboard-only walk of every track and back; Back and
  Forward; a direct load of each route; 1 to 6; reduced motion switched on mid-visit; phone layout
  with no fixed control overlapping content (check element boxes); the sheet's detents; no console
  errors.
- The critique re-run and the detector clean, apart from recorded on-world exceptions (teletext
  palette, CRT scanlines, the screens' glow).

## What's left to the builder

- Exact spring parameters within the ranges above, easing curves for the fold, the ink-wipe shape.
- Desk scatter positions and physics constants (the prototype's are a fine start).
- The worn-tape look, as long as it's subtle.
- How the left flap and right panel reflow between desktop widths.
- Which of the prototype's code to port and which to rewrite.

## Calls I made (owner to check)

- **Routes are real paths** (`/events`, not `/#events`), with the desk persistent across them.
- **The section devices are drawn images with live screens, not real-time 3D**, for phones and for
  real text. Only the player and tapes are real-time 3D.
- **Mixtape** keeps its function but gets the printed track list as its J-card, and the dot field
  moves while a song plays.
- **The underside** moves to a `turn over` on the desk, since there is no page bottom any more.
- **Played tapes look slightly worn** and show a play tick, the "memory" the critique asked for.
- **Paper is cool white, two inks**, deliberately away from warm cream.
- **The voice memo autoplays on open** (not under reduced motion), and the letter is always readable.
- **Teletext uses a self-hosted teletext face** on its screen only.
- **The prototype's other Events options (A–D, F) and the A–F switch are dropped.**
- **v1 stays live until v2 is whole**: phases merge into a `v2` branch, and `v2` into `main` at the end.
- **The owner reviews each device's art** before it's wired in; code proceeds on stand-in art.
- **Fixed numbering**: 03 is always mixtape; an empty track's key is printed blank (v1 closed the
  numbers up).
- **Eject is a seventh, smaller key** on the plate.
- **Extras' details**: the pencil lives on the desk and scrubs the memo in About; stickers persist per
  browser and have a keyboard placement; Side C is found by `c` three times or eject three times on
  an empty player, and exists only when the owner fills its `sideC` content; idle shuffle cues a tape
  but never loads one.
- **Night is lighting**: the J-card stays readable under the lamp; device renders take a light
  overlay instead of night renders; v1's graphite theme is retired.
