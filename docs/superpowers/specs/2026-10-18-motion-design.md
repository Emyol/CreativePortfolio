# Side A: motion, entrance and a real 3D player

Status: drafted 2026-10-18 from a long design session with the owner, who looked at each
mockup in the browser. Owner approval of this document is pending.

Builds on `2026-10-17-side-a-design.md` and **replaces its "Motion system" section** and its
"no WebGL" rule for the device. Everything else in that spec stands (World, site shape,
tracks, keys, knob, dock, mixtape, sound, keyboard, content rules).

## Intent

The owner likes the design but finds the site underwhelming: "generally everything is
underwhelming, though i like the design, it lacks animations and motion". The bar for how
motion should *feel* is https://xanderdacillo.vercel.app/ (smooth, continuous, scroll-led).
That site is a reference for smoothness only. The owner was explicit: do not copy its effects.
Every effect here comes from the tape player World.

Success, in the owner's terms:

- The site opens with a memorable entrance.
- Every section arrives in its **own** way. The owner rejected a shared template as
  "redundant/repetitive".
- Every section has **something to play with**, not just something to look at.
- Each section **holds** until its arrival has fully played. The owner's complaint: "i can't
  even see the full section fully and the animation is just halfway".
- The hero player is **real 3D**, interactive and alive, not "a plain item in the middle of
  the screen".
- The footer is the same 3D device turning over, with a seamless shadow.

## Goals, non-goals, anti-goals

Goals: all of the above, at a smooth frame rate on an ordinary laptop, with phones and reduced
motion handled properly.

Non-goals:

- New content or sections.
- Changes to the admin (`/admin`).
- Changes to the plain index (`/tracklist`).
- Sound design. Sound stays as is: off by default and never on scroll.

Anti-goals: any of these would make it a failure even if it "works".

- Copying the reference site's effects. That means no split-flap letter intro, no stacked
  colour panels and no blur-to-sharp word reveals.
- Content hidden from screen readers or keyboard users while animating.
- Text that only exists after an animation.
- Layout shift.
- Scroll that locks and makes you wait.
- A janky 3D hero.

## Decided by the owner (2026-10-18)

| Topic | Decision |
|---|---|
| Entrance | **"Screen first, then the tape loads"** (mockup option C followed by A), at normal speed, about 3 s until it settles |
| Section motion | Each section arrives differently and has its own interaction (see the table below). The only shared cue is the title flickering on |
| Holds | Each section **holds still while the visitor's scroll plays its arrival**, and releases only when the arrival has finished. Scrolling back reverses it |
| Hero | **Real-time 3D** (WebGL) from the Blender model. This replaces the "no WebGL" device decision. The owner chose it over fake 2.5D depth and pre-rendered angles |
| Footer | The 3D device turns over to show its underside. The shadow must be seamless, never cut off |
| The flip | Must be smoother than the current 24-frame sequence |
| Polish | "make necessary improvements when we implement": the builder fixes what the mockups show was rough (listed under "Known from the mockups") |

## Mockups

These are reference pages from the session, kept in
`docs/superpowers/mockups/2026-10-18-motion/`. They hold the exact timings and easings, and
the builder should read them. They are throwaway code, not something to port line by line.

| File | What it shows |
|---|---|
| `entrance.html` | The agreed entrance on the sprite device |
| `sections.html` | Every section's arrival, interaction and hold, the dock, the event-page opening, the pre-rendered flip and footer |
| `hero-3d.html` | The real-time 3D hero: the entrance in 3D, cursor tilt, drag-to-turn, key presses, knob, live screen, cassette pop, scroll lean |
| `spike-export-glb.py` | How the GLB was exported from `art/blender/side-a/device.py`: booleans baked, pivots added, node names |
| `spike-turnover.py` | How the turnover frames were rendered, including the two Blender pitfalls listed below |

Their images and the GLB are not committed (several MB). The scripts regenerate them. In
the mockups the assets were served from a local preview server at `/files/dev-*`.

## The entrance

This plays once per browser session (the existing `POWER_KEY` session flag).

**Never plays:** under reduced motion, when the page opens at a deep link (`/#events`), or
when returning from an event page. In those cases the device is simply there, settled.

It replaces today's 600 ms `usePowerOn` typing.

| t (s) | What happens |
|---|---|
| 0.10–0.75 | The page is the player's dark OLED screen, full viewport. A three-digit tape counter runs `000 → 120` (`power2.out`) |
| 0.78–0.88 | It flickers (opacity steps) and lands on `SIDE A` |
| 1.10–1.95 | The dark shrinks into the device's screen (`expo.inOut`, 0.85 s) while the device appears around it (opacity and scale 1.1 → 1, `expo.out`). The tape window is still empty |
| 1.85–2.45 | The cassette drops into the window (from above, slightly rotated, `power3.in`, 0.6 s) |
| 2.45–2.95 | The deck dips under the weight and springs back (`elastic.out(1, 0.45)`) |
| 2.53–3.9 | The reels spin up past idle speed and ease back down |
| 2.55–3.7 | The LED blinks on (4 steps). The keys rise one by one (`back.out(2.2)`, 75 ms stagger), the key labels fade in, the knob swings from −250° to the first track (`back.out(1.3)`), and `01 about` types onto the screen |

Rules:

- **Never in the way.** Any click, wheel, touch or key press finishes the entrance at once and
  lands on the settled state. Links, keys and screen readers work throughout.
- **No layout shift.** The overlay is fixed. The page underneath is laid out as normal.
- **No skip hint** on the real site. The mockup had one; the owner didn't ask for it.
- **3D not ready yet.** If the 3D hero isn't ready when the shrink starts (about 1.1 s), the
  dark shrinks into the static device image instead, and the 3D swaps in silently once ready.
  The entrance never waits on the network. In that case the rest of the entrance (the
  cassette drop, keys and knob) plays on the sprite device, as in `entrance.html`. When the 3D
  is ready, it plays in 3D, as in `hero-3d.html`.

## The hero: a real 3D player

The hero renders `art/blender/side-a/device.py`'s device in real time with three.js.

**Model pipeline.** Add a `glb` pass to `device.py` (`npm run device:render -- --only glb`).
It writes `public/device/device.glb`, compressed (meshopt or Draco via glTF-Transform or
gltfpack, as a dev dependency). Two lessons from the spike:

- **Bake every boolean.** Recesses are cut by cutter objects that stay in world space, so any
  moved part loses its cuts.
- **Add pivot nodes** for the reels (`HubLPivot`, `HubRPivot`) and the knob mark
  (`KnobMarkPivot`).

Node names the page relies on: `Key0`–`Key3`, `Cassette`, `PackL`, `PackR`, `OLEDGlass`,
`LEDLens`, plus the pivots above.

**Materials.** Blender's procedural brushing, knurling and rings don't export. Rebuild them
in three.js from `device.py`'s `M` table. The spike's values are in `hero-3d.html`. Brushed
aluminium needs real anisotropy or a baked roughness or normal map; the spike's plain metal
looked flat. The tape window glass also needs a proper look.

**Lighting.** An environment map (RoomEnvironment or a small HDRI) plus one key light. The key
light follows the cursor slightly, so reflections slide across the aluminium. A soft contact
shadow sits on the page, and it must not be clipped.

**What the visitor can do:**

| Input | Response |
|---|---|
| Cursor moves | The device tilts toward it (about ±7° by ±5°, eased about 0.9 s) and the light follows |
| Drag (desktop) | Turns the device up to about ±35°, springs back on release (`elastic.out`) |
| Click a key | It presses down in 3D and latches; the others release. The knob turns to that track; the screen flickers to `0N track`. Then the page goes to that track, as the current keys do |
| Click the cassette | It pops up out of the window and drops back (a bounce) |
| Idle | Reels turn slowly; while a song plays, at tape speed (as today) |
| Scroll away | The device leans back and sinks into the table while the dock rises in step (below) |

**Screen.** The screen is live text: a canvas texture over `OLEDGlass`, in Doto. It shows
what the current hero screen shows: power-on, track, now playing with time and playhead.

**Accessibility.** The 3D canvas is decorative (`aria-hidden`). The keys stay real HTML
buttons, visually hidden but focusable, placed over the 3D keys, in the same order with the
same labels as today. Focusing or pressing them drives the 3D press. All text the screen shows
is also in the DOM. Today's `h1` "Miel" and the keyboard behaviour stay unchanged.

**Fallbacks.** Today's sprite device (`components/device/Device.tsx`) is the fallback, and it
is the poster shown before the 3D is ready. It's used when:

- WebGL is unavailable or the context is lost;
- reduced motion is on, where the sprite device is shown still. My call: a still 3D frame
  would also do, but the sprite device needs no download;
- the 3D fails to load within a timeout.

**One renderer (my call).** The hero, the flip and the footer share one three.js renderer and
one loaded model. They don't open three WebGL contexts. Only the scene in view renders.

**Performance.** These are targets; the builder confirms them.

- three.js and the model load **after first paint**, with a dynamic import. LCP stays the
  sprite plate image.
- Added JS at most about 200 KB gzipped. The GLB at most about 500 KB.
- Render only while visible or animating: pause off-screen and in background tabs.
- Device pixel ratio capped at 2.

The spike measured 63k triangles, 18 draw calls and **1.2 ms per frame** on Intel UHD
integrated graphics. The automated test browser on the dev machine presents WebGL at about
1 fps even for an empty canvas, so frame-rate checks need a real browser.

## Hero to dock

This is scrubbed with the scroll over the hero's height:

- the 3D device leans back (about 30°), scales to about 0.72, sinks, and fades toward 0.15;
- the dock rises from below (`yPercent` 160 → 0, scale 0.92 → 1) over 45%–85% of the hero
  scroll, instead of switching on;
- the dock's little cassette reels turn with the scroll too.

The dock stays HTML and sprites: it's small and needs no 3D. Its side (A or B) comes from the
section in view, never from the flip animation. The mockup's dock once showed SIDE A at the
end of side B because spinning the cassette by hand set it.

## Sections: one hold each, a different arrival, something to play with

**The hold.** Each section pins once it is fully in view:

- if it fits above the dock, centred above it;
- else, if it fits on the screen, its top 10 px from the top;
- else, its bottom just above the dock.

While pinned, the visitor's scroll plays the arrival. The animation timeline is `scrub: true`;
Lenis already smooths the scroll, and an extra scrub delay made arrivals trail and still be
finishing as the section moved away. Every timeline ends with a still rest (15% of its length),
so the finished state is seen before release.

The hold distances measured in the mockup at 1280×800 are below. The builder tunes them.

Pin the section, never an element that is itself animated. In the mockup, pinning the turning
device made pin and turn fight.

**Verified behaviour to keep.** In the mockup, at about 2000 px/s and 5000 px/s of scroll,
every section was 100% done at release, didn't move while held, and none sat under the dock.

| Section | Arrival (scrubbed during the hold) | Hold | Interaction |
|---|---|---|---|
| Title of every section | Only shared cue: the dot-matrix title flickers on (6 opacity steps × 50 ms), timed rather than scrubbed, as the section's top reaches 80% of the viewport | — | — |
| About (`LinerNotes`) | The letter's **lines rise into place one by one**, each from behind its own edge (GSAP SplitText, lines masked; nothing of a line shows before its turn; changed 2026-10-24 from a J-card fold whose grey back and edges showed); meanwhile the candid's dot screen **powers on**, a scanline lighting it row by row, then one short flicker (once; again only after it has gone dark) | ~650 px | **Throw the candid's screen**: drag with inertia, it tilts with the drag speed, then springs back to its place (`elastic.out(1, 0.55)`) |
| Events (`LiveRecordings`) | A red **REC playhead** sweeps left to right across the grid; each photo is recorded in as the playhead passes (clip from left, dark and grey → full colour) | ~900 px | Photos **tilt toward the cursor** like a print in the hand (about ±8°/±10°), with a soft light following. **Click opens the event page** with the photo morphing into its header |
| Mixtape | Each title **prints like a label maker**, character by character, and its number punches in. Visual only; the text is in the DOM throughout | ~800 px | **Hover a song**: its small cassette slides out of the row like a tape from its case and the dock screen shows `CUE <title>`. **Play**: level bars bounce beside the row (decorative; Spotify gives no levels) and the reels go to tape speed |
| People (`Featuring`) | The names **roll past in a window like film credits**, faster than the page scrolls | ~1100 px | **Hover or focus a name**: it lights in the screen orange, spreads slightly, and its note opens |
| The flip (A → B) | Turns with the scroll, as today, but smooth (below) | its own section | **Grab the cassette and spin it**; let go mid-turn and it carries on with momentum and settles on a side |
| Made | Things are **dropped onto a dark table**, scattered at slight angles, landing with a small squash | ~850 px | **Drag and throw them** around the table (bounded, with inertia, raising the one held); a **Tidy up** button puts them back |
| On rotation | **Cassette spines drop into a rack** with a bounce | ~700 px | **Hover or focus a spine** to pull it up out of the rack and show its note below. **Fast scrolling makes the spines lean** with the scroll speed |
| Footer (`Underside`) | The **3D device turns over** onto its back (below) | ~1000 px | **Hover the sticker** and its corner peels |

The mockup used simplified stand-ins for each section. Apply these moves to the real
components and their real content, keeping each component's existing markup and semantics.

**Sections taller than the screen (my call).** Real content can be long, for example 20
events. Such a section holds with its top in view, for the part of its arrival that is on
screen. Then it releases, and the rest of its items arrive as they scroll in: the same move,
scrubbed per row as each row enters, with no second hold. Nothing important ever plays out of
sight.

**The admin preview (`/admin/preview`)** is the real tape, so it gets everything above.

**Removed:** today's 8 px fade-up (`TrackSection`'s `gsap.from`) and the rule of one small move
per component. The section-leaving dim and tip-back, and the panel-rises-up template, were
both tried and dropped as repetitive.

## The flip, smoother

**My call:** turn the flip into the 3D cassette (the `Cassette` node of the same GLB), in real
time. That makes it smooth at any scroll speed and any frame rate, and the spin with momentum
becomes a real rotation.

This is the cheaper way to get the smoothness the owner asked for:

- the mockup's 48 pre-rendered frames still stepped;
- blending neighbouring frames double-printed the moving parts mid-turn;
- 96 frames would weigh about 3 MB.

The existing 24 frames in `public/device/flip/` stay as the fallback for no WebGL and for the
`lite` tier.

When the turn passes halfway, the dock flickers to `SIDE B` and swaps its cassette shell.

## The footer: the device turns over

**My call:** real-time 3D, the same model, not a frame sequence. The owner asked for it "3d
rendered", and two rendered drafts both had shadow problems: the lifted device's shadow
spilled past the frame and was cut off. A real-time contact shadow on the page avoids that.

**The turn.** The device rises slightly, turns 180° about its long axis with a little wobble,
and lands on its rubber feet (smoothstep). The motion is in `spike-turnover.py`. The spike also
found the fixes the GLB pass must include:

- give the underside a thin skin rather than reusing the underside's full-height slab, which
  fills the top recesses;
- bake the booleans.

**At the end of the side.** The top face shows `SIDE B` on the screen and the B shell.

**Live content on the underside.** Once it lands, the toolbox text and the footer links appear
over the rendered sticker and battery door as live HTML. They are positioned from projected 3D
anchor points, so they line up at any size. All footer links and text are in the DOM the whole
time, for keyboard and screen readers.

The current `Underside` component's content and semantics are kept.

## Opening an event

The clicked photo grows into the event page's header. The rest of the page then writes in:
the meta line and title rise, the story paragraphs rise line by line, and the photos are dealt
in. Back reverses it.

Use React 19.3's `<ViewTransition>` with a shared name on the photo. The guide is in
`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`; it works in the App Router
without configuration. Browsers without support navigate normally.

The admin preview's event pages behave the same.

## Phones (`lite` tier) and reduced motion (`none`)

**Phones, my calls.**

- The entrance is the same.
- Holds keep about 60% of the desktop distance.
- The 3D hero runs at a device pixel ratio of at most 1.5, with no cursor tilt (a gentle idle
  sway instead) and no drag-turn, which would fight the page scroll. Taps on keys and the
  cassette work.
- The drag toys get tap versions, so they never fight the scroll:
  - a tap tosses the candid photo;
  - in Made, a tap picks an item up and drops it somewhere new;
  - in On rotation, a tap pulls a spine out.
- Event photos don't tilt.
- If the device can't keep up, the hero falls back to the sprite device.

**Reduced motion,** applied live as today:

- no entrance, no holds, no scrubbing;
- content shows complete;
- the hero is the still sprite device;
- the flip is a straight swap and the footer shows the underside;
- the interactions still work, without animation.

Switching it on mid-visit kills the pins and restores normal flow at once.

## Accessibility and robustness

**Keyboard and screen readers.**

- Focus moving into a held section completes its arrival at once (today's `focusin` pattern),
  and the page scrolls normally.
- Hash links and the dock keys land on a section already settled.
- Animated text stays in the DOM at all times: the label-maker and title effects are visual
  (clip and opacity), never `textContent` slicing.
- Every interaction has a keyboard path where it carries meaning: spines and names on focus,
  Tidy up as a button. The pure toys need none: throwing a photo, spinning, tilting.

**General.**

- Visible focus and contrast as today.
- Every GSAP setup inside `useGSAP` or `gsap.context`, reverted on unmount.
- No layout shift; pins reserve their scroll space.
- The 3D renderer and its listeners are disposed on unmount.

**Content rules.** Motion never invents content. The mixtape's level bars are decorative and
labelled as such in code.

## Known from the mockups (fix while building)

- **Brushed aluminium and glass.** These need real treatment in three.js.
- **The GLB.** It must be compressed: the spike's was 2.3 MB raw.
- **Frame-sequence weight, if any frames survive.** Lazy-load them as the section approaches.
- **The mockup's caption box and skip hint.** These are mockup-only.
- **Hit targets.** Keep the existing 44 px minimum on everything interactive, including the
  hidden key buttons over the 3D.

## What's left to the builder

- The exact hold distances, tilt amounts and spring settings, within the feel of the mockups.
- How the 3D layer is split into components and hooks, and how it shares state with the
  existing `ActiveTrack`, playback and `MotionProvider`.
- Compression tool, texture baking method, environment map.
- Test strategy. At minimum:
  - unit tests for pure pieces: the hold start rule, side-from-section, knob angles;
  - e2e tests: reduced motion has no pins; the entrance skips on input; each hold is complete
    at release; a deep link lands settled; the WebGL fallback renders the sprite device; no
    layout shift; the existing axe and tap-size checks still pass.

## Project notes to update when this ships

- **CLAUDE.md, "Decisions made":**
  - the Device art row (no longer "no WebGL": a real-time 3D hero, flip and footer, with
    sprites as fallback);
  - the Motion row (now the holds and per-section arrivals, not one move per component).
- **`art/blender/side-a/README.md`:** the new `glb` pass.

## Calls I made (owner to check)

1. The flip and the footer use **real-time 3D** instead of pre-rendered frames. This
   smooths the flip and fixes the footer's cut-off shadow. The current frames stay as the
   fallback.
2. **Reduced motion shows the sprite device**, not a still 3D render.
3. **On phones:** shorter holds, no cursor tilt or drag-turn on the hero, and tap versions of
   the drag toys.
4. **No skip hint** during the entrance. Any input skips it.
5. **The entrance doesn't wait for the 3D**; it shrinks into the static device if the 3D isn't
   ready.
6. **The dock stays HTML and sprites.**
7. **Sections taller than the screen** hold with their top in view, then the rest arrives row
   by row as it scrolls in.
8. **One shared 3D renderer** for the hero, the flip and the footer.
9. **The admin preview** gets the same motion as the live tape.
