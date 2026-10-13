# Kakejiku World: theme and site shape

Status: design approved in conversation 2026-10-13, written spec awaiting owner review.
Scope: the visual World, site shape and motion system of the public site. The content
model, Supabase project, photo hosting and admin port are separate specs (see
**Out of scope**).

## Intent

A personal site for peers, friends and collaborators that feels like *Miel*: anime,
video games and Japanese / East Asian aesthetics, with no hiring angle. It should be
fun to move through, not a CV in costume. Success looks like this: a visitor
scrolls the whole thing because the next chapter is worth seeing, and every piece of
content is something Miel supplied.

What the owner said, which this spec preserves:

- Not isometric. A **menu and a smooth scroll at once**, with transitions per part.
- Plain cards feel generic. Use an **old-scroll** framing, a **bento** for events, and
  stronger motion.
- No portrait in the hero. Creativity first.
- Kanji should be **written in real stroke order**. The finished look is the brush
  font, and the motion is a crisp pen line travelling each stroke (row "A + B" in the
  stroke-order prototype).
- Desktop first, built in one to four weeks.

## Reference prototypes

Throwaway HTML prototypes, published as private artifacts. They show the intent. They
are not code to port.

| Prototype | Shows |
|---|---|
| [Hanging Scroll Prototype](https://claude.ai/artifact/TQ2i5qduuGUpc8pBe2PVn5) | The chosen World: unroll intro, seal rail, seasons, all six components |
| [Stroke Order Test](https://claude.ai/artifact/C1JND9ADnBKzTxViszZEgg) | Kanji stroke-order styles. **Row "A + B" is the chosen one** |
| [Handscroll Prototype](https://claude.ai/artifact/S3gVs8bjBP9MoBnCnpuXXd) | Transition catalogue (brush wipe, ink bleed, mist, seal stamp, pinned pan) |
| [Menu Directions](https://claude.ai/artifact/7DzqvQ8gT8Fz811cevzMSX) | Six game-menu directions. The Sumi menu became the hero |

## The World

The site is a **kakejiku (掛軸), a hanging scroll on a wall**, read top to bottom.

- **Frame:** a cord, a wooden top roller with ivory caps, an indigo silk brocade border
  with a gold diamond lattice, and aged paper with light foxing. The page ends on the
  bottom roller with 終.
- **Palette:** sumi ink, aged paper, seal red as the **only** strong accent, indigo
  brocade with gold. Seasons only tint the wall and paper; they never add a second
  accent.
- **Typefaces**, one job each:

  | Face | Job |
  |---|---|
  | Yuji Syuku | Brush: chapter kanji, the name, display moments |
  | Shippori Mincho B1 | Headings |
  | Klee One | Handwriting: the About letter, captions, notes |
  | Zen Kaku Gothic New | Body text |

- **Japanese is decoration, English comes first.** Every piece of Japanese text is
  listed in a glossary with its reading and meaning, and checked before it ships.
  Nothing relies on Japanese to be understood.
- **Art:** textures and backgrounds (ink mountains, paper, brocade) may be generated.
  Content images are only the owner's own photos.

## Site shape

One long vertical page plus a page per event and a plain index.

1. **Hero:** the Sumi menu. Six vertical kanji columns over ink mountains. No portrait.
2. **Seal rail:** once the hero scrolls away, the menu becomes a fixed rail of seals
   that marks the current chapter and jumps to any chapter. Keys **1 to 6** jump too.
3. **Six chapters**, in this order:

| # | Chapter | Season tint | Component | Signature move |
|---|---|---|---|---|
| 1 | 私 About | spring | Handwritten letter on ruled paper, one taped-in candid photo, the toolbox as seal stamps | Letter writes in, stamps press |
| 2 | 祭 Events | summer festival **night** (dark indigo wall, lanterns) | Bento of mounted prints | Per-tile ink bleed from a random origin, inner parallax, pointer tilt |
| 3 | 音 Music | autumn | Ensō record and a setlist numbered 壱弐参肆伍 | The record spins |
| 4 | 趣 Hobbies | late autumn | Ema plaques | Drop in with an elastic ease, swing on hover |
| 5 | 棚 Shelf | winter | Manga and game spines, JRPG dialogue box | Pull a spine to open a typewriter dialogue |
| 6 | 縁 People | plum blossom | Red-thread map | The thread draws on scroll, nodes appear |

4. **Event pages** at `/events/<slug>`: each bento tile opens its own page, with the
   tile morphing into the page header (View Transition, see **To verify**).
5. **目録 (mokuroku):** a plain index page with no motion and the full content as a
   simple list. It is linked from the skip link, the footer and the rail.

## Motion system

**Entrance (once per visit):** the scroll unrolls from the top roller, the ink
mountains soak in, and ミエル is written stroke by stroke. Then the menu staggers in.
A returning visitor in the same session skips straight to the settled hero.

**Chapter kanji** are written in real stroke order:

- Stroke data is **KanjiVG** (CC BY-SA 3.0, Ulrich Apel). Each stroke path animates
  `stroke-dashoffset` in order.
- Look B, motion A: a crisp pen line leads each stroke while the Yuji Syuku glyph is
  revealed through a mask that follows the same path. When the last stroke ends, the
  mask widens to show the full glyph and the pen line fades out.
- Stroke duration scales with path length, with a minimum per stroke and a short gap
  between strokes.
- Covered: the six chapter kanji, 終, and the kana of ミエル.

**Shared transitions**, used everywhere:

- **Ink bleed:** a radial mask reveal for glyphs and event prints.
- **Brush divider:** a brush-stroke path draws between chapters, ending in that
  chapter's season seal.
- **Seal stamp:** each chapter heading gets a seal that presses in.
- Each component adds its **one** signature move from the table above. No component
  gets a second one.

**Seasons:** as a chapter becomes active, the wall and paper tints tween to its season.
Weather (petals, lanterns, maple, ginkgo, snow, plum) blows through as **one short
gust at the season change**, then stops. No weather runs continuously.

**Stack:** Lenis for smooth scroll, GSAP with ScrollTrigger for scroll-driven motion,
the Web Animations API or GSAP for stroke drawing. Every GSAP setup lives in a
`gsap.context` (or `useGSAP`) and reverts on unmount.

**Reduced motion works live.** On a `prefers-reduced-motion` change, without a reload:
Lenis is destroyed and native scroll returns, GSAP contexts revert to final states,
weather particles stop, pointer tilt is removed, and kanji render fully written. The
seal rail, keys and every link still work.

## Game layer (light)

- Keyboard: 1 to 6 jump between chapters; the Shelf dialogue advances with Enter or
  Space.
- The Shelf is an inventory: spines are items, the dialogue box describes them.
- **Sound is off by default.** A visible toggle turns on a soft wood-block tap. The
  choice is remembered in `localStorage` (wrapped in try/catch; the site works without
  it).
- Easter eggs, starting with the Konami code (a crane flies across and a toast
  appears). Easter eggs never hide content.

## Content rules this World must respect

- Every event, hobby, song, title, person and photo comes from the owner via
  `content-inbox/`. **Prototypes used placeholder text; none of it ships.**
- Events are events Miel **attended**.
- Photos of Miel: one candid in About, plus wherever Miel appears in event photos. None
  in the hero.
- The toolbox stays a supporting stamp set, limited to what the professional content
  supports.
- No phone number anywhere.

## Accessibility

Carried over from portfolioV2 and extended for this World:

- Skip link to 目録 and to main content; real heading levels (one `h1`, one `h2` per
  chapter).
- Every chapter, seal, spine, plaque and tile is reachable and operable by keyboard
  with a visible focus style that reads on both the paper and the dark Events wall.
- Kanji and decorative SVG have English accessible names (`私` is "About") or are
  hidden from assistive tech when an English label sits next to them.
- Contrast: body text meets WCAG AA on every season tint, including the dark Events
  wall.
- No scroll-jacking that breaks native keyboard or assistive scrolling. Pinned
  sections release normally.

## Licensing

KanjiVG is CC BY-SA 3.0. The site footer and the 目録 page credit "Stroke order data:
KanjiVG by Ulrich Apel, CC BY-SA 3.0" with a link to http://kanjivg.tagaini.net. Any
edited KanjiVG paths stay under CC BY-SA. Fonts are from Google Fonts under the OFL.

## To verify in planning

- **View Transitions in Next.js 16.** Read `node_modules/next/dist/docs/` once Next is
  installed. If the morph from tile to event page is not supported cleanly, fall back
  to a GSAP crossfade with the tile image reused as the header.
- **Lenis with the App Router**: scroll restoration and `#hash` jumps between the main
  page, event pages and 目録.
- Performance budget for the canvas weather and the bento on a mid-range laptop.

## Out of scope

- Content model and Supabase project (own spec, together with the public site build).
- Photo hosting, domain and hosting.
- The admin editor port (its own spec, plan and build).
- Mobile polish beyond "works and reads": desktop is the priority, phones get the
  same content without heavy motion.
