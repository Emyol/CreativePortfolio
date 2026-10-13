# Kakejiku Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public creative portfolio as a Kakejiku (hanging scroll) World. It has a Sumi menu hero that becomes a seal rail, six seasonal chapters each with one signature component, a page per event, and a plain 目録 index. Everything is driven by validated content that only the owner supplies.

**Architecture:** Next.js 16 App Router with server components for every page, and small client "islands" for motion. All content comes through one validated loader (`getContent()`) that reads `lib/content/seed.json`. One `MotionProvider` computes a live motion tier (`full` / `lite` / `none`) from media queries, and every animated component reads it and reverts when it changes. Motion is authored as "final state in CSS, animate *from* hidden", so a reverted GSAP context or a missing script always leaves content visible.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript 5, CSS Modules, GSAP 3.15 + ScrollTrigger + `@gsap/react` 2.1, Lenis 1.3, Zod 4, Vitest 5 + Testing Library + jsdom, Playwright 1.64 + `@axe-core/playwright`, KanjiVG stroke data.

**Spec:** `docs/superpowers/specs/2026-10-13-kakejiku-world-design.md`. Read it before Task 0. The spec says *what*; this plan says *how*. If the two disagree, the spec wins, so stop and ask the owner.

## Global Constraints

Every task's requirements implicitly include these.

- **Never invent content.** Every event, hobby, song, title, person and photo comes from the owner via `content-inbox/`. "Prototypes used placeholder text; none of it ships." Fixtures exist only for development and tests, are labelled `Fixture …`, and can never be built for production.
- "Events" means events Miel **attended**.
- **No phone number anywhere** (no `tel:` links, no `+63…`, no `09xx…`).
- **No portrait in the hero.** Photos of Miel appear only as one candid in About and inside event photos.
- The toolbox is limited to the professional stack in `docs/reference/professional-inventory.md` (enforced by the schema in Task 2).
- **Japanese is decoration, English comes first.** Every Japanese character in the source or the content must appear in `lib/glossary.ts` (enforced by a test in Task 3). Wrap Japanese text in `lang="ja"`.
- **Palette:** sumi ink, aged paper, seal red (`#a8281f`) as the **only** strong accent, indigo brocade with gold. Seasons only tint.
- **Typefaces, one job each:** Yuji Syuku = brush, Shippori Mincho B1 = headings, Klee One = handwriting, Zen Kaku Gothic New = body.
- **Reduced motion works live**, without a reload. Lenis is destroyed, GSAP contexts revert to final states, weather stops, tilt is removed, and kanji render fully written. The seal rail, keys and links still work.
- **Accessibility:** a skip link to main content and to 目録. One `h1`, one `h2` per chapter. Everything interactive is keyboard-operable with a visible focus ring on both paper and the dark Events wall. Body text meets WCAG AA (4.5:1) on every season tint. There's no scroll-jacking.
- **Desktop first.** Below 768px wide ("lite" tier): no Lenis, no entrance, no weather, no tilt, no parallax. The content is the same.
- **Licence credit** in the footer and on 目録: "Stroke order data: KanjiVG by Ulrich Apel, CC BY-SA 3.0", linked to `http://kanjivg.tagaini.net`.
- **Before writing any Next.js code**, read the relevant guide in `node_modules/next/dist/docs/`. This Next.js has breaking changes from what you may remember (for example, `params` is a `Promise`, and `next lint` is gone).
- **Git:** follow `.claude/skills/git-operations/SKILL.md`. Use conventional commits that explain *why*. **No `Co-Authored-By` or "Generated with" lines, ever.** Never stage `.env*`, `content-inbox/` material, `.next/`, `test-results/` or `playwright-report/`.
- **Dependencies:** only those listed in Task 0. Adding another one needs the `pick-ui-library` skill and a sentence in the PR body.

## Review Focus

These are five conditions the spec implies but no feature test would naturally hit. Each has a pinned test in the task named.

1. **Reduced motion switched on mid-animation** (during the entrance, a kanji being written, or a bento bleed). Expected: everything snaps to its final, visible state, with nothing left clipped, transparent or half-written. *Pinned in Task 22 (e2e `reduced-motion-live.spec.ts`), with unit coverage in Tasks 5 and 6.*
2. **Chapters with no content.** The inbox is empty today, so most chapters may launch empty. Expected: an empty chapter is absent from the page, the hero menu, the rail, the 1–6 keys and 目録, with no placeholder and no blank section. A completely empty site still renders hero, footer and 終. *Pinned in Task 3 (`visibleChapters`), Task 10 (rail and keys with fewer chapters) and Task 21 (index).*
3. **Chapter keys while typing or with modifiers.** Ctrl+1 switches browser tabs, and digits typed into a field must not jump. Expected: 1–6 only act with no modifier and outside editable elements. *Pinned in Task 10 (`shouldHandleChapterKey`).*
4. **Deep links and back navigation with Lenis.** Expected: `/#music` loaded cold, the rail clicked, or "Back to Events" from an event page each lands with the chapter heading at the top and keyboard focus on it. *Pinned in Task 9 (e2e `navigation.spec.ts`) and Task 15.*
5. **The entrance never traps the visitor.** Expected: pressing Tab, scrolling or clicking during the entrance finishes it at once, the skip link is reachable, and a second visit in the same session skips it. If JavaScript fails, the hero still unclips within 4s. *Pinned in Task 11 (e2e `entrance.spec.ts`).*

## Milestones and branches

The work is one context, but 23 tasks is too much for one PR. Group the commits into four stacked PRs, each opened after its last task passes, following git-operations (`/review-pr` plus `experience-reviewer` before each PR):

| Milestone | Tasks | Branch |
|---|---|---|
| M1 Foundation | 0–7 | `feat/kakejiku-foundation` |
| M2 Scroll and shape | 8–12 | `feat/kakejiku-shape` (from M1) |
| M3 Chapters | 13–19 | `feat/kakejiku-chapters` (from M2) |
| M4 Game layer, index, hardening | 20–22 | `feat/kakejiku-finish` (from M3) |

Cut M1 from `main` after PRs #1 and #2 are merged. If they aren't merged yet, cut it from `docs/kakejiku-plan` and say so in the PR body.

## File structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.mts, playwright.config.ts
app/
  layout.tsx                 fonts, <html> season vars, skip links, entrance pre-paint script, providers
  globals.css                reset, tokens, focus, sr-only, tier rules
  page.tsx                   the scroll: hero, rail, chapters, footer
  events/[slug]/page.tsx     one page per event
  mokuroku/page.tsx          plain index, no motion
lib/
  color.ts                   WCAG luminance and contrast
  seasons.ts                 season tokens (single source for CSS vars and tweens)
  random.ts                  mulberry32 seeded RNG
  dates.ts                   formatDate for YYYY / YYYY-MM / YYYY-MM-DD
  chapters.ts                chapter registry, visibleChapters, chapterForKey, shouldHandleChapterKey
  glossary.ts                every Japanese string with reading and meaning
  content/schema.ts          Zod schema, SiteContent types, PROFESSIONAL_STACK
  content/load.ts            getContent(), parseContent()
  content/seed.json          REAL content only (empty at start)
  content/fixtures.ts        dev/test fixtures, never built for production
  kanji/strokes.json         generated KanjiVG stroke paths (CC BY-SA 3.0)
  kanji/index.ts             getStrokes(char)
  kanji/schedule.ts          strokeSchedule, scheduleEnd
  motion/tier.ts             MotionTier, computeTier, media queries, ENTRANCE_PREPAINT
  motion/MotionProvider.tsx  live tier context, sets <html data-tier>
  motion/gsap.ts             registers ScrollTrigger and useGSAP once
  motion/storage.ts          try/catch local and session storage
  motion/useInViewOnce.ts    IntersectionObserver hook
  motion/navigate.ts         Lenis handle, scrollToId with focus
  motion/mountains.ts        procedural ink mountain paths
  weather.ts                 gust particle simulation (pure)
  shelf.ts                   dialogue reducer, splitPages
  thread.ts                  red-thread layout
  konami.ts                  konamiStep
  sound.ts                   sound store and wood-block tap
components/
  Ja.tsx                     <span lang="ja">
  Photo.tsx                  next/image wrapper for content photos
  frame/ScrollFrame.tsx (+ .module.css)   cord, rollers, brocade, paper
  frame/Footer.tsx (+ .module.css)        bottom roller with 終, credits, sound toggle, index link
  kanji/StrokeKanji.tsx (+ .module.css)   one character written in stroke order
  kanji/StrokeWord.tsx                    characters written in sequence
  kanji/StrokeKanjiInView.tsx             writes when scrolled into view
  motion/SmoothScroll.tsx                 Lenis lifecycle
  motion/HashLinks.tsx                    same-page anchor handling + cold deep links
  motion/InkBleed.tsx (+ .module.css)
  motion/BrushDivider.tsx (+ .module.css)
  motion/SealStamp.tsx (+ .module.css)
  motion/ActiveChapter.tsx                one IntersectionObserver for rail + seasons
  motion/SeasonController.tsx             wall tint tween + gust trigger
  motion/WeatherGust.tsx                  canvas gust
  hero/Hero.tsx (+ .module.css), hero/InkMountains.tsx, hero/Entrance.tsx
  rail/SealRail.tsx (+ .module.css)
  chapters/ChapterSection.tsx (+ .module.css)
  chapters/About.tsx, Events.tsx, Music.tsx, Hobbies.tsx, Shelf.tsx, People.tsx (each + .module.css)
  game/SoundToggle.tsx, game/Konami.tsx (+ .module.css)
scripts/fetch-kanjivg.mjs
tests/setup.ts, tests/media.ts           Vitest setup, controllable matchMedia
e2e/*.spec.ts                            Playwright
```

Unit tests sit next to their source as `*.test.ts(x)`.

---

### Task 0: Scaffold Next.js 16, tooling and smoke tests

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.mts`, `playwright.config.ts`, `tests/setup.ts`, `tests/media.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/smoke.test.ts`, `e2e/smoke.spec.ts`, `docs/reference/next16-notes.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run typecheck | test | test:e2e | build | dev | dev:fixtures | kanji:fetch`. `tests/media.ts` exports `setMedia(query: string, matches: boolean): void` and `resetMedia(): void`, which every later unit test uses to drive `matchMedia`.

`create-next-app` refuses this folder because it isn't empty (`CLAUDE.md`, `.claude/`, `content-inbox/`), so set it up by hand.

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull   # or docs/kakejiku-plan, see Milestones
git checkout -b feat/kakejiku-foundation
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "creative-portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "dev:fixtures": "cross-env CONTENT_SOURCE=fixtures next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "kanji:fetch": "node scripts/fetch-kanjivg.mjs"
  }
}
```

- [ ] **Step 3: Install the exact versions**

```bash
npm install next@16.4.0 react@19.3.0 react-dom@19.3.0 gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.26 zod@4.6.7
npm install -D typescript @types/node @types/react @types/react-dom vitest@5.0.4 @vitejs/plugin-react@6.1.2 jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/jest-dom@7.0.1 @testing-library/user-event @playwright/test@1.64.0 @axe-core/playwright@4.13.0 cross-env
npx playwright install chromium
```

- [ ] **Step 4: Read the Next.js docs before writing Next code**

```bash
ls node_modules/next/dist/docs/
```

Read the guides on: the App Router layout and page conventions, `generateStaticParams` and `dynamicParams`, the `params` Promise, `next/font/google`, `next/image`, metadata, and **view transitions** (search: `grep -ril "viewTransition\|ViewTransition" node_modules/next/dist/docs/`). Write what you find in `docs/reference/next16-notes.md`, one bullet per topic, each with the doc file path. Task 15 depends on the view-transition notes. If `next dev` writes an `AGENTS.md`, read it and commit it.

- [ ] **Step 5: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.mts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

If `next dev` rewrites any field later, keep its version and commit it.

- [ ] **Step 6: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 7: Write the Vitest config and setup**

`vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
  },
});
```

`tests/media.ts`: jsdom has no `matchMedia`, so this one is controllable and fires `change` like a real browser:

```ts
type Listener = (e: MediaQueryListEvent) => void;
const state = new Map<string, boolean>();
const listeners = new Map<string, Set<Listener>>();

export function setMedia(query: string, matches: boolean): void {
  state.set(query, matches);
  for (const l of listeners.get(query) ?? []) l({ matches, media: query } as MediaQueryListEvent);
}

export function resetMedia(): void {
  state.clear();
  listeners.clear();
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const set = listeners.get(query) ?? new Set<Listener>();
    listeners.set(query, set);
    return {
      get matches() {
        return state.get(query) ?? false;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, l: Listener) => set.add(l),
      removeEventListener: (_: string, l: Listener) => set.delete(l),
      addListener: (l: Listener) => set.add(l),
      removeListener: (l: Listener) => set.delete(l),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  };
}
```

`tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { installMatchMedia, resetMedia } from "./media";

installMatchMedia();

class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// jsdom has no IntersectionObserver; tests that need one stub it locally.
globalThis.IntersectionObserver ??= NoopIntersectionObserver as unknown as typeof IntersectionObserver;

afterEach(() => {
  cleanup();
  resetMedia();
});
```

- [ ] **Step 8: Write the Playwright config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    env: { CONTENT_SOURCE: "fixtures" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

The e2e suite runs against fixtures on the dev server, because the loader (Task 2) refuses fixtures in a production build.

- [ ] **Step 9: Write the failing smoke tests**

`lib/smoke.test.ts`:

```ts
import { expect, test } from "vitest";

test("matchMedia is controllable", async () => {
  const { setMedia } = await import("@/tests/media");
  setMedia("(prefers-reduced-motion: reduce)", true);
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
});
```

`e2e/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("home page responds with the site title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Miel/);
});
```

- [ ] **Step 10: Run them and see the e2e test fail**

Run: `npm test` (expected PASS: setup works) then `npm run test:e2e` (expected FAIL: there is no `app/` yet, so the server 404s).

- [ ] **Step 11: Minimal app**

`app/globals.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
```

`app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Miel",
  description: "Miel's hanging scroll: events, music, hobbies, the shelf and the people around him.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:

```tsx
export default function Home() {
  return <main id="main" />;
}
```

- [ ] **Step 12: Run everything**

Run: `npm run typecheck && npm test && npm run test:e2e && npm run build`
Expected: all PASS.

- [ ] **Step 13: Ignore build output and commit**

Add these to `.gitignore` if missing: `.next/`, `node_modules/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `next-env.d.ts` (Next regenerates it).

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.mts playwright.config.ts tests app lib/smoke.test.ts e2e docs/reference/next16-notes.md .gitignore
git commit -m "chore: scaffold Next.js 16 with Vitest and Playwright" -m "The spec is approved, so the site needs a base. Set up by hand because create-next-app refuses a non-empty folder. E2E runs on the dev server against fixtures, since production builds refuse them. Next 16 docs findings are recorded for later tasks." -m "Verified: typecheck, unit smoke, e2e smoke, next build."
```

---

### Task 1: Design tokens, fonts and season contrast

**Files:**
- Create: `lib/color.ts`, `lib/color.test.ts`, `lib/seasons.ts`, `lib/seasons.test.ts`
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Produces:
  - `contrastRatio(a: string, b: string): number`
  - `type SeasonId = "top" | "spring" | "summer-night" | "autumn" | "late-autumn" | "winter" | "plum"`
  - `type WeatherKind = "petal" | "lantern" | "maple" | "ginkgo" | "snow" | "plum"`
  - `type Season = { wall; paper; ink; muted; focus: string; weather: WeatherKind | null }`
  - `SEASONS: Record<SeasonId, Season>`, `SEAL_RED`, `BROCADE`, `GOLD`
  - `seasonVars(id: SeasonId): React.CSSProperties`, which returns `--wall --paper --ink --muted --focus`
  - CSS font variables `--font-brush --font-heading --font-hand --font-body`

- [ ] **Step 1: Write the failing tests**

`lib/color.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { contrastRatio } from "./color";

describe("contrastRatio", () => {
  test("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
  test("is symmetric", () => {
    expect(contrastRatio("#a8281f", "#efe6d2")).toBeCloseTo(contrastRatio("#efe6d2", "#a8281f"), 6);
  });
  test("rejects non-hex input", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow(/#rrggbb/);
  });
});
```

`lib/seasons.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { contrastRatio } from "./color";
import { SEAL_RED, SEASONS, seasonVars, type SeasonId } from "./seasons";

const ids = Object.keys(SEASONS) as SeasonId[];

describe.each(ids)("season %s", (id) => {
  const s = SEASONS[id];
  test("body ink meets WCAG AA on its paper", () => {
    expect(contrastRatio(s.ink, s.paper)).toBeGreaterThanOrEqual(4.5);
  });
  test("muted text meets WCAG AA on its paper", () => {
    expect(contrastRatio(s.muted, s.paper)).toBeGreaterThanOrEqual(4.5);
  });
  test("focus ring meets 3:1 non-text contrast on its paper", () => {
    expect(contrastRatio(s.focus, s.paper)).toBeGreaterThanOrEqual(3);
  });
});

test("white seal text on seal red meets AA", () => {
  expect(contrastRatio("#ffffff", SEAL_RED)).toBeGreaterThanOrEqual(4.5);
});

test("the Events season is the dark one", () => {
  expect(contrastRatio(SEASONS["summer-night"].paper, "#000000")).toBeLessThan(2);
});

test("seasonVars exposes CSS custom properties from the single source", () => {
  expect(seasonVars("winter")).toMatchObject({ "--paper": SEASONS.winter.paper, "--ink": SEASONS.winter.ink });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/color.test.ts lib/seasons.test.ts`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement**

`lib/color.ts`:

```ts
function channel(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(m[1].slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

`lib/seasons.ts`:

```ts
import type { CSSProperties } from "react";

export type SeasonId = "top" | "spring" | "summer-night" | "autumn" | "late-autumn" | "winter" | "plum";
export type WeatherKind = "petal" | "lantern" | "maple" | "ginkgo" | "snow" | "plum";
export type Season = { wall: string; paper: string; ink: string; muted: string; focus: string; weather: WeatherKind | null };

/** The only strong accent in the World. */
export const SEAL_RED = "#a8281f";
export const BROCADE = "#1f2a4d";
export const GOLD = "#b8954a";

export const SEASONS: Record<SeasonId, Season> = {
  top: { wall: "#26231f", paper: "#efe6d2", ink: "#1d1b18", muted: "#5a5248", focus: SEAL_RED, weather: null },
  spring: { wall: "#3a3032", paper: "#f3e7e1", ink: "#1d1b18", muted: "#5c4f4c", focus: SEAL_RED, weather: "petal" },
  "summer-night": { wall: "#0f1426", paper: "#18203a", ink: "#f1e8d6", muted: "#c9bfa8", focus: "#f2c14e", weather: "lantern" },
  autumn: { wall: "#3a2b22", paper: "#f1e3cd", ink: "#1d1b18", muted: "#5d4c3c", focus: SEAL_RED, weather: "maple" },
  "late-autumn": { wall: "#35301c", paper: "#f0e6c6", ink: "#1d1b18", muted: "#585036", focus: SEAL_RED, weather: "ginkgo" },
  winter: { wall: "#262d33", paper: "#eef0ee", ink: "#1d1b18", muted: "#4f5559", focus: SEAL_RED, weather: "snow" },
  plum: { wall: "#34232a", paper: "#f4e5e7", ink: "#1d1b18", muted: "#5e4a50", focus: SEAL_RED, weather: "plum" },
};

export function seasonVars(id: SeasonId): CSSProperties {
  const s = SEASONS[id];
  return { "--wall": s.wall, "--paper": s.paper, "--ink": s.ink, "--muted": s.muted, "--focus": s.focus } as CSSProperties;
}
```

If a contrast test fails, **change the colour** (darken ink or muted, or lighten paper). Never lower a threshold.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run lib/color.test.ts lib/seasons.test.ts`. Expected: PASS.

- [ ] **Step 5: Fonts and global tokens**

Check the `next/font/google` notes from Task 0 first. `app/layout.tsx` becomes:

```tsx
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Klee_One, Shippori_Mincho_B1, Yuji_Syuku, Zen_Kaku_Gothic_New } from "next/font/google";
import { BROCADE, GOLD, SEAL_RED, seasonVars } from "@/lib/seasons";
import "./globals.css";

// CJK fonts are large; preload: false lets the browser fetch only the unicode-range slices it uses.
const brush = Yuji_Syuku({ weight: "400", subsets: ["latin"], variable: "--font-brush", display: "swap", preload: false });
const heading = Shippori_Mincho_B1({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-heading", display: "swap", preload: false });
const hand = Klee_One({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-hand", display: "swap", preload: false });
const body = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Miel",
  description: "Miel's hanging scroll: events, music, hobbies, the shelf and the people around him.",
};

const rootVars = { ...seasonVars("top"), "--seal": SEAL_RED, "--brocade": BROCADE, "--gold": GOLD } as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  const fonts = [brush, heading, hand, body].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={fonts} style={rootVars}>
      <body>{children}</body>
    </html>
  );
}
```

`app/globals.css` (replace):

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }

html {
  background: var(--wall);
  color: var(--ink);
  font-family: var(--font-body), system-ui, sans-serif;
  font-size: 100%;
  line-height: 1.7;
  text-rendering: optimizeLegibility;
}
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}

h1, h2, h3 { font-family: var(--font-heading), serif; line-height: 1.25; font-weight: 700; }
img, svg, canvas { display: block; max-width: 100%; }
a { color: inherit; text-underline-offset: 0.2em; }

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
  border-radius: 2px;
}

.sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}
```

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npm test && npm run build`. Expected: PASS.

```bash
git add lib/color.ts lib/color.test.ts lib/seasons.ts lib/seasons.test.ts app/layout.tsx app/globals.css
git commit -m "feat: add season tokens with contrast tests and the four typefaces" -m "Seasons are the single source for every tint, so CSS vars and the later wall tween can't drift apart. AA contrast is enforced per season in tests, including the dark Events night, rather than checked by eye." -m "Verified: typecheck, unit tests, build."
```

---

### Task 2: Content schema, loader and fixtures

**Files:**
- Create: `lib/content/schema.ts`, `lib/content/load.ts`, `lib/content/seed.json`, `lib/content/fixtures.ts`, `lib/content/schema.test.ts`, `lib/content/load.test.ts`, `lib/random.ts`, `lib/random.test.ts`, `lib/dates.ts`, `lib/dates.test.ts`

**Interfaces:**
- Produces:
  - `PROFESSIONAL_STACK` (readonly tuple of 17 strings)
  - Types: `Photo = { src: string; alt: string; width: number; height: number }`, `EventItem = { slug; name; date: string; place?: string; summary: string; story: string[]; photos: Photo[] }`, `Track = { title: string; note?: string; link?: string }`, `Hobby = { name: string; note: string; photo?: Photo; link?: string }`, `ShelfItem = { title: string; kind: "manga" | "game" | "anime"; note: string }`, `Person = { name: string; relation: string; note?: string; link?: string }`, `About = { letter: string[]; candid?: Photo; toolbox: (typeof PROFESSIONAL_STACK)[number][] }`, `SiteContent = { about: About; events: EventItem[]; music: Track[]; hobbies: Hobby[]; shelf: ShelfItem[]; people: Person[] }`
  - `contentSchema`
  - `parseContent(raw: unknown, source: string): SiteContent` (throws a readable error)
  - `getContent(): Promise<SiteContent>`
  - `mulberry32(seed: number): () => number`
  - `formatDate(date: string): string`

The content-model spec (separate) may grow this schema. It's deliberately shaped like portfolioV2's `seed.json`, because the admin port derives its editor from the seed's shape.

- [ ] **Step 1: Write the failing tests**

`lib/random.test.ts`:

```ts
import { expect, test } from "vitest";
import { mulberry32 } from "./random";

test("same seed gives the same sequence in [0, 1)", () => {
  const a = mulberry32(42), b = mulberry32(42);
  const xs = Array.from({ length: 5 }, () => a());
  expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
  for (const x of xs) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  }
});
```

`lib/dates.test.ts`:

```ts
import { expect, test } from "vitest";
import { formatDate } from "./dates";

test.each([
  ["2025", "2025"],
  ["2025-10", "October 2025"],
  ["2025-10-03", "3 October 2025"],
  ["2024-01-01", "1 January 2024"],
])("formatDate(%s) = %s", (input, out) => {
  expect(formatDate(input)).toBe(out);
});

test("rejects impossible dates", () => {
  expect(() => formatDate("2025-13")).toThrow();
  expect(() => formatDate("2025-02-30")).toThrow();
});
```

`lib/content/schema.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { contentSchema } from "./schema";
import { FIXTURES } from "./fixtures";

const empty = { about: { letter: [], toolbox: [] }, events: [], music: [], hobbies: [], shelf: [], people: [] };
const photo = { src: "/photos/a.jpg", alt: "A lantern", width: 1200, height: 800 };
const event = { slug: "night-market", name: "Night market", date: "2025-10", summary: "Went.", photos: [photo] };

describe("contentSchema", () => {
  test("accepts an entirely empty site (launch state)", () => {
    expect(contentSchema.parse(empty)).toMatchObject(empty);
  });
  test("accepts the fixtures", () => {
    expect(() => contentSchema.parse(FIXTURES)).not.toThrow();
  });
  test("rejects a photo without alt text", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, photos: [{ ...photo, alt: " " }] }] })).toThrow(/alt/);
  });
  test("rejects an event without photos", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, photos: [] }] })).toThrow(/photo/);
  });
  test("rejects duplicate event slugs", () => {
    expect(() => contentSchema.parse({ ...empty, events: [event, event] })).toThrow(/duplicate/i);
  });
  test("rejects non-kebab slugs", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, slug: "Night Market" }] })).toThrow(/slug/);
  });
  test("rejects a sixth song: the setlist only has five numerals", () => {
    const track = { title: "Song" };
    expect(() => contentSchema.parse({ ...empty, music: Array(6).fill(track) })).toThrow(/five/);
  });
  test("rejects a toolbox item the professional site does not support", () => {
    expect(() => contentSchema.parse({ ...empty, about: { letter: [], toolbox: ["Rust"] } })).toThrow();
  });
  test("rejects photos hosted elsewhere", () => {
    expect(() => contentSchema.parse({ ...empty, about: { letter: ["Hi"], toolbox: [], candid: { ...photo, src: "https://x.com/a.jpg" } } })).toThrow(/public/);
  });
  test("rejects malformed dates", () => {
    expect(() => contentSchema.parse({ ...empty, events: [{ ...event, date: "Oct 2025" }] })).toThrow(/date/);
  });
});
```

`lib/content/load.test.ts`:

```ts
import { afterEach, describe, expect, test, vi } from "vitest";
import { getContent, parseContent } from "./load";
import seed from "./seed.json";

afterEach(() => vi.unstubAllEnvs());

describe("content loading", () => {
  test("seed.json is valid", () => {
    expect(() => parseContent(seed, "seed.json")).not.toThrow();
  });
  test("seed.json never contains fixture text", () => {
    expect(JSON.stringify(seed)).not.toMatch(/fixture/i);
  });
  test("invalid content fails loudly with the source and the field", () => {
    expect(() => parseContent({ events: "nope" }, "seed.json")).toThrow(/seed\.json[\s\S]*events/);
  });
  test("fixtures load in development", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("NODE_ENV", "development");
    const c = await getContent();
    expect(c.events.length).toBeGreaterThan(0);
  });
  test("fixtures are refused in a production build", async () => {
    vi.stubEnv("CONTENT_SOURCE", "fixtures");
    vi.stubEnv("NODE_ENV", "production");
    await expect(getContent()).rejects.toThrow(/development only/);
  });
  test("without the flag, the real seed is used", async () => {
    const c = await getContent();
    expect(c).toEqual(parseContent(seed, "seed.json"));
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/random.test.ts lib/dates.test.ts lib/content`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the helpers**

`lib/random.ts`:

```ts
/** Small deterministic RNG so procedural art and tests are repeatable. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`lib/dates.ts`:

```ts
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Formats YYYY, YYYY-MM or YYYY-MM-DD without timezone shifts. */
export function formatDate(date: string): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(date);
  if (!m) throw new Error(`Bad date "${date}"`);
  const [, y, mo, d] = m;
  if (!mo) return y;
  const month = Number(mo);
  if (month < 1 || month > 12) throw new Error(`Bad month in "${date}"`);
  if (!d) return `${MONTHS[month - 1]} ${y}`;
  const day = Number(d);
  const last = new Date(Date.UTC(Number(y), month, 0)).getUTCDate();
  if (day < 1 || day > last) throw new Error(`Bad day in "${date}"`);
  return `${day} ${MONTHS[month - 1]} ${y}`;
}
```

- [ ] **Step 4: Implement the schema**

`lib/content/schema.ts`:

```ts
import { z } from "zod";
import { formatDate } from "@/lib/dates";

/** From docs/reference/professional-inventory.md. The toolbox may only use these. */
export const PROFESSIONAL_STACK = [
  "Python", "TypeScript", "Dart", "Kotlin", "C / C++",
  "Flutter", "Next.js", "ONNX Runtime", "REST APIs",
  "On-device ML", "Vector retrieval", "Geospatial", "Compilers",
  "Git", "SAP Activate", "Agile / Scrum", "Claude Code",
] as const;

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case, e.g. pycon-ph-2025");
const date = z.string().refine((d) => {
  try { formatDate(d); return true; } catch { return false; }
}, "date must be a real YYYY, YYYY-MM or YYYY-MM-DD");
const link = z.url();

export const photoSchema = z.object({
  // Photos live in public/ until the content-model spec decides hosting. data: is for fixtures only.
  src: z.string().refine((s) => s.startsWith("/") || s.startsWith("data:image/"), "photo src must be a path under public/, e.g. /photos/x.jpg"),
  alt: z.string().trim().min(1, "every photo needs alt text"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const eventSchema = z.object({
  slug,
  name: text,
  date,
  place: text.optional(),
  summary: text,
  story: z.array(text).default([]),
  photos: z.array(photoSchema).min(1, "an event needs at least one photo"),
});

export const contentSchema = z.object({
  about: z.object({
    letter: z.array(text),
    candid: photoSchema.optional(),
    toolbox: z.array(z.enum(PROFESSIONAL_STACK)),
  }),
  events: z.array(eventSchema).superRefine((events, ctx) => {
    const seen = new Set<string>();
    for (const e of events) {
      if (seen.has(e.slug)) ctx.addIssue({ code: "custom", message: `duplicate event slug "${e.slug}"` });
      seen.add(e.slug);
    }
  }),
  music: z.array(z.object({ title: text, note: text.optional(), link: link.optional() })).max(5, "the setlist has five numerals (壱 to 伍); keep it to five songs"),
  hobbies: z.array(z.object({ name: text, note: text, photo: photoSchema.optional(), link: link.optional() })),
  shelf: z.array(z.object({ title: text, kind: z.enum(["manga", "game", "anime"]), note: text })),
  people: z.array(z.object({ name: text, relation: text, note: text.optional(), link: link.optional() })),
});

export type SiteContent = z.output<typeof contentSchema>;
export type Photo = z.output<typeof photoSchema>;
export type EventItem = z.output<typeof eventSchema>;
export type About = SiteContent["about"];
export type Track = SiteContent["music"][number];
export type Hobby = SiteContent["hobbies"][number];
export type ShelfItem = SiteContent["shelf"][number];
export type Person = SiteContent["people"][number];
```

The 壱 to 伍 in the error message is Japanese and needs glossary entries (Task 3 adds them).

- [ ] **Step 5: Seed, fixtures and loader**

`lib/content/seed.json`: the **launch state**, empty until the owner supplies material:

```json
{
  "about": { "letter": [], "toolbox": [] },
  "events": [],
  "music": [],
  "hobbies": [],
  "shelf": [],
  "people": []
}
```

`lib/content/fixtures.ts`: obviously fake text and worst cases (a long name, an unbroken word, five songs, a multi-page note, a single person, seven events so the bento wraps):

```ts
import type { SiteContent } from "./schema";

function swatch(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 30% 35%)"/><stop offset="1" stop-color="hsl(${hue + 40} 35% 15%)"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="60" y="740" font-size="64" fill="#fff" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const photo = (n: number) => ({ src: swatch(`Fixture photo ${n}`, n * 37), alt: `Fixture photo ${n}`, width: 1200, height: 800 });

/** Development and test data only. getContent() refuses these in production builds. */
export const FIXTURES: SiteContent = {
  about: {
    letter: [
      "Fixture letter, first paragraph. This text stands in for the owner's own letter and never ships.",
      "Fixture letter, second paragraph, long enough to wrap across several ruled lines on a desktop screen so the write-in reveal can be judged properly.",
    ],
    candid: photo(0),
    toolbox: ["TypeScript", "Python", "Next.js", "Git"],
  },
  events: Array.from({ length: 7 }, (_, i) => ({
    slug: `fixture-event-${i + 1}`,
    name: i === 2 ? "Fixture event with an extraordinarily long name that should wrap gracefully" : i === 4 ? "FixtureEventWithAnUnbrokenWordThatMustNotOverflow" : `Fixture event ${i + 1}`,
    date: i % 2 ? `2025-0${i + 1}` : `2024-0${i + 1}-1${i}`,
    place: i === 3 ? undefined : `Fixture place ${i + 1}`,
    summary: `Fixture summary for event ${i + 1}.`,
    story: [`Fixture story paragraph for event ${i + 1}.`, "A second fixture paragraph."],
    photos: [photo(i + 1), photo(i + 11)],
  })),
  music: Array.from({ length: 5 }, (_, i) => ({ title: `Fixture song ${i + 1}`, note: i === 0 ? "Fixture note." : undefined, link: i === 1 ? "https://example.com/fixture" : undefined })),
  hobbies: [
    { name: "Fixture hobby one", note: "Fixture note.", photo: photo(30) },
    { name: "Fixture hobby two", note: "Fixture note that runs a little longer than the first.", link: "https://example.com/fixture" },
    { name: "Fixture hobby three", note: "Fixture note." },
  ],
  shelf: [
    { title: "Fixture manga", kind: "manga", note: "Fixture page one.\n\nFixture page two.\n\nFixture page three." },
    { title: "Fixture game with a long title", kind: "game", note: "Fixture single page." },
    { title: "Fixture anime", kind: "anime", note: "Fixture page one.\n\nFixture page two." },
  ],
  people: [
    { name: "Fixture person A", relation: "Fixture relation", note: "Fixture note." },
    { name: "Fixture person B", relation: "Fixture relation", link: "https://example.com/fixture" },
    { name: "Fixture person C", relation: "Fixture relation" },
    { name: "Fixture person D", relation: "Fixture relation" },
  ],
};
```

`lib/content/load.ts`:

```ts
import { z } from "zod";
import { contentSchema, type SiteContent } from "./schema";
import seed from "./seed.json";

export function parseContent(raw: unknown, source: string): SiteContent {
  const result = contentSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid content in ${source}:\n${z.prettifyError(result.error)}`);
  return result.data;
}

export async function getContent(): Promise<SiteContent> {
  if (process.env.CONTENT_SOURCE === "fixtures") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CONTENT_SOURCE=fixtures is for development only. Unset it before building.");
    }
    // Dynamic import keeps fixtures out of the production module graph.
    const { FIXTURES } = await import("./fixtures");
    return parseContent(FIXTURES, "lib/content/fixtures.ts");
  }
  return parseContent(seed, "lib/content/seed.json");
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run lib`. Expected: PASS. If `z.prettifyError` or `z.url` have different names in the installed Zod, check `node_modules/zod` and adapt; the tests define the behaviour.

- [ ] **Step 7: Commit**

```bash
git add lib/random.ts lib/random.test.ts lib/dates.ts lib/dates.test.ts lib/content
git commit -m "feat: validate site content through one loader with guarded fixtures" -m "Every page reads content through getContent(), so bad content fails the build with the file and field instead of rendering broken. The seed launches empty because nothing may be invented; fixtures cover worst cases for development and are refused in production builds." -m "Verified: unit tests for schema rules, loader guards and date formatting."
```

---

### Task 3: Chapter registry, glossary and content-rule scans

**Files:**
- Create: `lib/chapters.ts`, `lib/chapters.test.ts`, `lib/glossary.ts`, `lib/rules.test.ts`, `components/Ja.tsx`

**Interfaces:**
- Consumes: `SiteContent` (Task 2), `SeasonId` (Task 1).
- Produces:
  - `type ChapterId = "about" | "events" | "music" | "hobbies" | "shelf" | "people"`
  - `type Chapter = { id: ChapterId; kanji: string; label: string; season: SeasonId; seal: string }`
  - `CHAPTERS: readonly Chapter[]`
  - `hasContent(id: ChapterId, c: SiteContent): boolean`
  - `visibleChapters(c: SiteContent): Chapter[]`
  - `chapterForKey(key: string, visible: Chapter[]): Chapter | undefined`
  - `shouldHandleChapterKey(e: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target">): boolean`
  - `GLOSSARY: readonly { term: string; reading: string; meaning: string }[]`
  - `<Ja>`: a `<span lang="ja">` wrapper with all span props passed through

- [ ] **Step 1: Write the failing tests**

`lib/chapters.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { CHAPTERS, chapterForKey, shouldHandleChapterKey, visibleChapters } from "./chapters";
import { FIXTURES } from "./content/fixtures";
import type { SiteContent } from "./content/schema";

const empty: SiteContent = { about: { letter: [], toolbox: [] }, events: [], music: [], hobbies: [], shelf: [], people: [] };

describe("chapters", () => {
  test("six chapters in spec order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["about", "events", "music", "hobbies", "shelf", "people"]);
    expect(CHAPTERS.map((c) => c.kanji).join("")).toBe("私祭音趣棚縁");
  });
  test("an empty site shows no chapters", () => {
    expect(visibleChapters(empty)).toEqual([]);
  });
  test("about needs a letter, not just a toolbox", () => {
    expect(visibleChapters({ ...empty, about: { letter: [], toolbox: ["Git"] } })).toEqual([]);
  });
  test("only chapters with content are visible, order kept", () => {
    const c = { ...empty, music: [{ title: "x" }], people: [{ name: "a", relation: "b" }] };
    expect(visibleChapters(c).map((ch) => ch.id)).toEqual(["music", "people"]);
  });
  test("fixtures show all six", () => {
    expect(visibleChapters(FIXTURES)).toHaveLength(6);
  });
  test("keys map to rail position, not chapter number", () => {
    const visible = visibleChapters({ ...empty, music: [{ title: "x" }], people: [{ name: "a", relation: "b" }] });
    expect(chapterForKey("1", visible)?.id).toBe("music");
    expect(chapterForKey("2", visible)?.id).toBe("people");
    expect(chapterForKey("3", visible)).toBeUndefined();
    expect(chapterForKey("0", visible)).toBeUndefined();
    expect(chapterForKey("a", visible)).toBeUndefined();
  });
});

describe("shouldHandleChapterKey", () => {
  const base = { key: "1", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target: document.body };
  test("plain digit on the page", () => expect(shouldHandleChapterKey(base)).toBe(true));
  test.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)("ignored with %s", (mod) => {
    expect(shouldHandleChapterKey({ ...base, [mod]: true })).toBe(false);
  });
  test.each(["input", "textarea", "select"])("ignored while typing in <%s>", (tag) => {
    expect(shouldHandleChapterKey({ ...base, target: document.createElement(tag) })).toBe(false);
  });
  test("ignored in contenteditable", () => {
    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.append(div);
    expect(shouldHandleChapterKey({ ...base, target: div })).toBe(false);
    div.remove();
  });
});
```

`lib/rules.test.ts`: the content-rule scans over source and seed:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { GLOSSARY } from "./glossary";

const ROOTS = ["app", "components", "lib"];
const SKIP = [/\.test\.tsx?$/, /fixtures\.ts$/, /strokes\.json$/, /glossary\.ts$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|json|css)$/.test(p) && !SKIP.some((r) => r.test(p)) ? [p] : [];
  });
}
const sources = ROOTS.flatMap(files).concat("lib/content/seed.json");
const CJK = /[\u3040-\u30ff\u3400-\u9fff]/g;

describe("content rules", () => {
  test("every Japanese character in source and content is in the glossary", () => {
    const known = new Set(GLOSSARY.flatMap((g) => [...g.term]));
    const missing = sources.flatMap((f) => [...new Set(readFileSync(f, "utf8").match(CJK) ?? [])].filter((ch) => !known.has(ch)).map((ch) => `${ch} in ${f}`));
    expect(missing).toEqual([]);
  });
  test("every glossary entry has a reading and an English meaning", () => {
    for (const g of GLOSSARY) {
      expect(g.reading.trim(), g.term).not.toBe("");
      expect(g.meaning.trim(), g.term).not.toBe("");
    }
  });
  test("no phone numbers anywhere", () => {
    const phone = /tel:|\+63|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;
    expect(sources.filter((f) => phone.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/chapters.test.ts lib/rules.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`lib/chapters.ts`:

```ts
import type { SiteContent } from "./content/schema";
import type { SeasonId } from "./seasons";

export type ChapterId = "about" | "events" | "music" | "hobbies" | "shelf" | "people";
export type Chapter = { id: ChapterId; kanji: string; label: string; season: SeasonId; seal: string };

export const CHAPTERS: readonly Chapter[] = [
  { id: "about", kanji: "私", label: "About", season: "spring", seal: "春" },
  { id: "events", kanji: "祭", label: "Events", season: "summer-night", seal: "夏" },
  { id: "music", kanji: "音", label: "Music", season: "autumn", seal: "秋" },
  { id: "hobbies", kanji: "趣", label: "Hobbies", season: "late-autumn", seal: "霜" },
  { id: "shelf", kanji: "棚", label: "Shelf", season: "winter", seal: "冬" },
  { id: "people", kanji: "縁", label: "People", season: "plum", seal: "梅" },
];

export function hasContent(id: ChapterId, c: SiteContent): boolean {
  return id === "about" ? c.about.letter.length > 0 : c[id].length > 0;
}

/** Empty chapters never render: no placeholder, no rail seal, no key. */
export function visibleChapters(c: SiteContent): Chapter[] {
  return CHAPTERS.filter((ch) => hasContent(ch.id, c));
}

/** Keys 1-6 follow the rail as the visitor sees it. */
export function chapterForKey(key: string, visible: Chapter[]): Chapter | undefined {
  if (!/^[1-6]$/.test(key)) return undefined;
  return visible[Number(key) - 1];
}

type KeyLike = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target">;

export function shouldHandleChapterKey(e: KeyLike): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  const t = e.target as HTMLElement | null;
  if (!t || !(t instanceof HTMLElement)) return true;
  if (t.isContentEditable || t.getAttribute("contenteditable") === "true") return false;
  return !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}
```

`lib/glossary.ts`: every Japanese string the site shows. Owner check: Step 5.

```ts
export type GlossaryEntry = { term: string; reading: string; meaning: string };

export const GLOSSARY: readonly GlossaryEntry[] = [
  { term: "掛軸", reading: "kakejiku", meaning: "hanging scroll, the shape of this site" },
  { term: "ミエル", reading: "Mieru", meaning: "Miel, written in katakana" },
  { term: "私", reading: "watashi", meaning: "I, me: the About chapter" },
  { term: "祭", reading: "matsuri", meaning: "festival: the Events chapter" },
  { term: "音", reading: "oto", meaning: "sound: the Music chapter" },
  { term: "趣", reading: "omomuki", meaning: "taste, pursuit: the Hobbies chapter" },
  { term: "棚", reading: "tana", meaning: "shelf: the Shelf chapter" },
  { term: "縁", reading: "en", meaning: "bond, connection: the People chapter" },
  { term: "春", reading: "haru", meaning: "spring, the season seal for About" },
  { term: "夏", reading: "natsu", meaning: "summer, the season seal for Events" },
  { term: "秋", reading: "aki", meaning: "autumn, the season seal for Music" },
  { term: "霜", reading: "shimo", meaning: "frost, the late-autumn seal for Hobbies" },
  { term: "冬", reading: "fuyu", meaning: "winter, the season seal for Shelf" },
  { term: "梅", reading: "ume", meaning: "plum blossom, the seal for People" },
  { term: "壱弐参肆伍", reading: "ichi, ni, san, shi, go", meaning: "one to five in formal numerals, numbering the setlist" },
  { term: "目録", reading: "mokuroku", meaning: "index, catalogue: the plain index page" },
  { term: "終", reading: "owari", meaning: "the end" },
  { term: "鶴", reading: "tsuru", meaning: "crane, from the Konami easter egg" },
];
```

`components/Ja.tsx`:

```tsx
import type { ComponentProps } from "react";

/** Japanese text: sets lang so screen readers and fonts treat it correctly. */
export function Ja(props: ComponentProps<"span">) {
  return <span lang="ja" {...props} />;
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run lib`. Expected: PASS. Any later task that adds Japanese text adds a glossary entry in the same commit, or this test fails.

- [ ] **Step 5: Owner check**

List the glossary in the M1 PR body under "Owner: please check readings and meanings". Spec: "checked before it ships".

- [ ] **Step 6: Commit**

```bash
git add lib/chapters.ts lib/chapters.test.ts lib/glossary.ts lib/rules.test.ts components/Ja.tsx
git commit -m "feat: add chapter registry, glossary and content-rule scans" -m "Empty chapters disappear everywhere from one function, so launch with a sparse inbox stays clean. The glossary and phone-number scans turn two content rules into failing tests instead of reviewer memory." -m "Verified: unit tests including modifier and editable-target key handling."
```

---

### Task 4: KanjiVG stroke data

**Files:**
- Create: `scripts/fetch-kanjivg.mjs`, `lib/kanji/strokes.json` (generated), `lib/kanji/index.ts`, `lib/kanji/index.test.ts`, `lib/kanji/LICENSE.md`

**Interfaces:**
- Produces: `getStrokes(char: string): readonly string[]`, which throws for unknown characters, and `KANJI_CHARS: readonly string[]`. Paths are in KanjiVG's `0 0 109 109` coordinate space, in stroke order.

- [ ] **Step 1: Write the failing test**

`lib/kanji/index.test.ts`:

```ts
import { expect, test } from "vitest";
import { getStrokes, KANJI_CHARS } from "./index";

// Stroke counts from standard references; KanjiVG must agree.
const COUNTS: Record<string, number> = { 私: 7, 祭: 11, 音: 9, 趣: 15, 棚: 12, 縁: 15, 終: 11, ミ: 3, エ: 3, ル: 2 };

test.each(Object.entries(COUNTS))("%s has %i strokes", (ch, n) => {
  expect(getStrokes(ch)).toHaveLength(n);
});

test("every path is SVG path data starting with a moveto", () => {
  for (const ch of KANJI_CHARS) for (const d of getStrokes(ch)) expect(d).toMatch(/^[Mm]/);
});

test("unknown characters fail loudly", () => {
  expect(() => getStrokes("猫")).toThrow(/fetch-kanjivg/);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run lib/kanji`. Expected: FAIL.

- [ ] **Step 3: Write the fetch script**

`scripts/fetch-kanjivg.mjs`:

```js
// Downloads KanjiVG stroke paths for the characters the site writes.
// KanjiVG (c) Ulrich Apel, CC BY-SA 3.0, http://kanjivg.tagaini.net
import { writeFileSync } from "node:fs";

const CHARS = ["私", "祭", "音", "趣", "棚", "縁", "終", "ミ", "エ", "ル"];
const BASE = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/";

const out = {};
for (const ch of CHARS) {
  const code = ch.codePointAt(0).toString(16).padStart(5, "0");
  const res = await fetch(`${BASE}${code}.svg`);
  if (!res.ok) throw new Error(`KanjiVG ${code} (${ch}): HTTP ${res.status}`);
  const svg = await res.text();
  const strokes = [...svg.matchAll(/<path\s+id="kvg:[0-9a-f]+-s(\d+)"[^>]*?\sd="([^"]+)"/g)]
    .map((m) => ({ n: Number(m[1]), d: m[2] }))
    .sort((a, b) => a.n - b.n)
    .map((s) => s.d);
  if (strokes.length === 0) throw new Error(`No strokes parsed for ${ch}`);
  out[ch] = strokes;
  console.log(`${code} ${strokes.length} strokes`);
}
writeFileSync(new URL("../lib/kanji/strokes.json", import.meta.url), JSON.stringify(out, null, 1) + "\n", "utf8");
```

The `console.log` prints codes, not characters, because the Windows console codepage chokes on CJK.

- [ ] **Step 4: Generate the data and the licence note**

Run: `npm run kanji:fetch`. Expected: ten lines, ending with `030eb 2 strokes`.

`lib/kanji/LICENSE.md`:

```md
`strokes.json` is derived from KanjiVG, Copyright (C) Ulrich Apel,
licensed under CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/).
Source: http://kanjivg.tagaini.net. Regenerate with `npm run kanji:fetch`.
Any edits to these paths stay under CC BY-SA 3.0.
```

- [ ] **Step 5: Implement the accessor**

`lib/kanji/index.ts`:

```ts
import data from "./strokes.json";

const STROKES = data as Record<string, string[]>;
export const KANJI_CHARS: readonly string[] = Object.keys(STROKES);

export function getStrokes(char: string): readonly string[] {
  const s = STROKES[char];
  if (!s) throw new Error(`No KanjiVG strokes for "${char}". Add it to scripts/fetch-kanjivg.mjs and run npm run kanji:fetch.`);
  return s;
}
```

- [ ] **Step 6: Run the test and see it pass, then commit**

Run: `npx vitest run lib`. Expected: PASS (including the glossary scan: every character is already in the glossary).

```bash
git add scripts/fetch-kanjivg.mjs lib/kanji
git commit -m "feat: vendor KanjiVG stroke paths for the written kanji" -m "Kanji must be written in real stroke order, which needs authoritative stroke data. Generated by a script so it can be regenerated and audited; licence noted next to the data because CC BY-SA requires attribution and share-alike." -m "Verified: stroke counts for all ten characters match references."
```

---

### Task 5: Live motion tier, storage helpers and GSAP registration

**Files:**
- Create: `lib/motion/tier.ts`, `lib/motion/tier.test.ts`, `lib/motion/MotionProvider.tsx`, `lib/motion/MotionProvider.test.tsx`, `lib/motion/storage.ts`, `lib/motion/storage.test.ts`, `lib/motion/gsap.ts`, `lib/motion/useInViewOnce.ts`
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Produces:
  - `type MotionTier = "full" | "lite" | "none"`
  - `computeTier(reduce: boolean, narrow: boolean): MotionTier`
  - `REDUCE_QUERY`, `NARROW_QUERY`
  - `MotionTierContext` (React context, default `"full"`; tests override it)
  - `<MotionProvider>`, which sets `document.documentElement.dataset.tier`
  - `useMotionTier(): MotionTier`
  - `readStorage(kind: "local" | "session", key: string): string | null`, `writeStorage(kind, key, value: string): void`
  - `gsap`, `ScrollTrigger`, `useGSAP` re-exported from `@/lib/motion/gsap`
  - `useInViewOnce(ref: RefObject<Element | null>, rootMargin?: string): boolean`

**The motion contract every later component follows:**
1. Author the **final** visual state in CSS. Animate *from* hidden with `gsap.from`/`fromTo` inside `useGSAP(fn, { scope, dependencies: [tier], revertOnUpdate: true })`.
2. Start the function with `if (tier === "none") return;`. Effects that are "full only" (Lenis, weather, tilt, parallax, entrance) also return when `tier === "lite"`.
3. On a tier change, `revertOnUpdate` reverts the context, so everything returns to the CSS final state.
4. CSS reads `html[data-tier="none"]` for anything CSS animates (spins, swings).

- [ ] **Step 1: Write the failing tests**

`lib/motion/tier.test.ts`:

```ts
import { expect, test } from "vitest";
import { computeTier } from "./tier";

test.each([
  [false, false, "full"],
  [false, true, "lite"],
  [true, false, "none"],
  [true, true, "none"],
] as const)("reduce=%s narrow=%s -> %s", (reduce, narrow, tier) => {
  expect(computeTier(reduce, narrow)).toBe(tier);
});
```

`lib/motion/MotionProvider.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { setMedia } from "@/tests/media";
import { MotionProvider, useMotionTier } from "./MotionProvider";
import { NARROW_QUERY, REDUCE_QUERY } from "./tier";

function Show() {
  return <p>{useMotionTier()}</p>;
}

test("tier follows media queries live, without remounting", () => {
  render(<MotionProvider><Show /></MotionProvider>);
  expect(screen.getByText("full")).toBeInTheDocument();
  expect(document.documentElement.dataset.tier).toBe("full");

  act(() => setMedia(REDUCE_QUERY, true));
  expect(screen.getByText("none")).toBeInTheDocument();
  expect(document.documentElement.dataset.tier).toBe("none");

  act(() => setMedia(REDUCE_QUERY, false));
  act(() => setMedia(NARROW_QUERY, true));
  expect(screen.getByText("lite")).toBeInTheDocument();
});
```

`lib/motion/storage.test.ts`:

```ts
import { afterEach, expect, test, vi } from "vitest";
import { readStorage, writeStorage } from "./storage";

afterEach(() => vi.restoreAllMocks());

test("round-trips a value", () => {
  writeStorage("local", "k", "v");
  expect(readStorage("local", "k")).toBe("v");
});

test("never throws when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readStorage("session", "k")).toBeNull();
  expect(() => writeStorage("session", "k", "v")).not.toThrow();
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/motion`. Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/motion/tier.ts`:

```ts
export type MotionTier = "full" | "lite" | "none";

export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
export const NARROW_QUERY = "(max-width: 767px)";

/** none: reduced motion. lite: phones, light motion only. full: desktop. */
export function computeTier(reduce: boolean, narrow: boolean): MotionTier {
  if (reduce) return "none";
  return narrow ? "lite" : "full";
}
```

`lib/motion/MotionProvider.tsx`:

```tsx
"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { computeTier, NARROW_QUERY, REDUCE_QUERY, type MotionTier } from "./tier";

export const MotionTierContext = createContext<MotionTier>("full");
export const useMotionTier = () => useContext(MotionTierContext);

function subscribe(onChange: () => void) {
  const queries = [REDUCE_QUERY, NARROW_QUERY].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}
const snapshot = (): MotionTier => computeTier(window.matchMedia(REDUCE_QUERY).matches, window.matchMedia(NARROW_QUERY).matches);
// Server renders "full" markup; CSS (globals.css) shows final states for reduced-motion
// visitors before hydration, so they never see hidden content.
const serverSnapshot = (): MotionTier => "full";

export function MotionProvider({ children }: { children: ReactNode }) {
  const tier = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);
  return <MotionTierContext.Provider value={tier}>{children}</MotionTierContext.Provider>;
}
```

`lib/motion/storage.ts`:

```ts
type Kind = "local" | "session";

function store(kind: Kind): Storage {
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

// Storage throws in private windows and when site data is blocked. Every caller has a
// sensible default, so a failure means "no saved preference", not an error.
export function readStorage(kind: Kind, key: string): string | null {
  try {
    return store(kind).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(kind: Kind, key: string, value: string): void {
  try {
    store(kind).setItem(key, value);
  } catch {
    // See readStorage: the preference just isn't remembered.
  }
}
```

`lib/motion/gsap.ts`:

```ts
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };
```

`lib/motion/useInViewOnce.ts`:

```ts
"use client";
import { useEffect, useState, type RefObject } from "react";

export function useInViewOnce(ref: RefObject<Element | null>, rootMargin = "0px 0px -15% 0px"): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen, rootMargin]);
  return seen;
}
```

- [ ] **Step 4: Wire the provider in and add tier CSS**

In `app/layout.tsx`, wrap `{children}`:

```tsx
import { MotionProvider } from "@/lib/motion/MotionProvider";
// ...
<body>
  <MotionProvider>{children}</MotionProvider>
</body>
```

Append to `app/globals.css`:

```css
/* Tier rules. Anything animated by CSS stops here; GSAP-driven motion reverts in JS. */
html[data-tier="none"] *,
html[data-tier="none"] *::before,
html[data-tier="none"] *::after {
  animation-duration: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
}
```

- [ ] **Step 5: Run the tests and see them pass, then commit**

Run: `npm run typecheck && npx vitest run`. Expected: PASS.

```bash
git add lib/motion app/layout.tsx app/globals.css
git commit -m "feat: add a live motion tier shared by every animated component" -m "Reduced motion must work without a reload, so the tier is a subscribed media-query store rather than a load-time check. A lite tier keeps phones on light motion. Storage access is wrapped because private windows throw." -m "Verified: tier switches live in a unit test; storage survives blocked access."
```

---

### Task 6: Stroke-order kanji (look B, motion A)

**Files:**
- Create: `lib/kanji/schedule.ts`, `lib/kanji/schedule.test.ts`, `components/kanji/StrokeKanji.tsx`, `components/kanji/StrokeKanji.module.css`, `components/kanji/StrokeWord.tsx`, `components/kanji/StrokeKanjiInView.tsx`, `components/kanji/StrokeKanji.test.tsx`
- Modify: `app/layout.tsx` (no-JS fallback)

**Interfaces:**
- Consumes: `getStrokes` (Task 4), `useMotionTier`, `useInViewOnce` (Task 5).
- Produces:
  - `strokeSchedule(lengths: number[], opts?: { speed?: number; minMs?: number; gapMs?: number }): { delay: number; duration: number }[]`, `scheduleEnd(s): number`
  - `type StrokeMode = "idle" | "write" | "done"`
  - `<StrokeKanji char mode label? onDone? className? />`
  - `<StrokeWord text mode onDone? className? charClassName? />`
  - `<StrokeKanjiInView char label? className? />`
  - The rendered `<svg>` carries `data-phase`, `data-mask` paths and a `data-pen-group`.

How it looks (spec, "Look B, motion A"): a crisp pen line travels each KanjiVG stroke while the Yuji Syuku glyph is revealed through a mask following the same path. After the last stroke the mask widens 15→40 to show the whole glyph, and the pen layer fades out.

- [ ] **Step 1: Write the failing tests**

`lib/kanji/schedule.test.ts`:

```ts
import { expect, test } from "vitest";
import { scheduleEnd, strokeSchedule } from "./schedule";

test("duration scales with length, with a minimum and a gap", () => {
  const s = strokeSchedule([260, 10, 520], { speed: 260, minMs: 140, gapMs: 70 });
  expect(s).toEqual([
    { delay: 0, duration: 1000 },
    { delay: 1070, duration: 140 },
    { delay: 1280, duration: 2000 },
  ]);
  expect(scheduleEnd(s)).toBe(3280);
});

test("no strokes, no time", () => {
  expect(scheduleEnd(strokeSchedule([]))).toBe(0);
});
```

`components/kanji/StrokeKanji.test.tsx`:

```tsx
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { StrokeKanji } from "./StrokeKanji";
import { StrokeWord } from "./StrokeWord";

const animate = vi.fn(() => ({ cancel: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom implements neither SVG geometry nor the Web Animations API.
  Object.defineProperty(SVGElement.prototype, "getTotalLength", { value: () => 52, configurable: true });
  Object.defineProperty(Element.prototype, "animate", { value: animate, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  animate.mockClear();
});

const withTier = (tier: MotionTier, ui: ReactNode) => <MotionTierContext.Provider value={tier}>{ui}</MotionTierContext.Provider>;

test("renders one pen path and one mask path per stroke", () => {
  const { container } = render(withTier("full", <StrokeKanji char="私" mode="idle" />));
  expect(container.querySelectorAll("[data-pen]")).toHaveLength(7);
  expect(container.querySelectorAll("[data-mask]")).toHaveLength(7);
});

test("labelled kanji are images with an English name; unlabelled ones are hidden", () => {
  const { getByRole, container } = render(
    withTier("full", <><StrokeKanji char="終" mode="done" label="The end" /><StrokeKanji char="私" mode="done" /></>),
  );
  expect(getByRole("img", { name: "The end" })).toBeInTheDocument();
  expect(container.querySelectorAll("svg")[1]).toHaveAttribute("aria-hidden", "true");
});

test("reduced motion renders fully written and animates nothing", () => {
  const { container } = render(withTier("none", <StrokeKanji char="私" mode="write" />));
  expect(container.querySelector("svg")).toHaveAttribute("data-phase", "done");
  expect(animate).not.toHaveBeenCalled();
});

test("write animates pen and mask per stroke, widens the mask, fades the pen, then reports done", () => {
  const onDone = vi.fn();
  const { container } = render(withTier("full", <StrokeKanji char="ル" mode="write" onDone={onDone} />));
  // 2 strokes x (pen + mask) + 2 mask widenings + 1 pen fade
  expect(animate).toHaveBeenCalledTimes(7);
  act(() => vi.advanceTimersByTime(10_000));
  expect(onDone).toHaveBeenCalledOnce();
  expect(container.querySelector("svg")).toHaveAttribute("data-phase", "done");
});

test("switching to reduced motion mid-write cancels and shows the finished glyph", () => {
  const { container, rerender } = render(withTier("full", <StrokeKanji char="私" mode="write" />));
  rerender(withTier("none", <StrokeKanji char="私" mode="write" />));
  expect(container.querySelector("svg")).toHaveAttribute("data-phase", "done");
  const anims = animate.mock.results.map((r) => r.value as { cancel: ReturnType<typeof vi.fn> });
  expect(anims.length).toBeGreaterThan(0);
  expect(anims.every((a) => a.cancel.mock.calls.length === 1)).toBe(true);
});

test("StrokeWord writes characters in sequence and reports done once", async () => {
  const onDone = vi.fn();
  const { container } = render(withTier("full", <StrokeWord text="ミエル" mode="write" onDone={onDone} />));
  for (let i = 0; i < 3; i++) await act(async () => vi.advanceTimersByTime(10_000));
  expect(onDone).toHaveBeenCalledOnce();
  expect([...container.querySelectorAll("svg")].map((s) => s.getAttribute("data-phase"))).toEqual(["done", "done", "done"]);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/kanji components/kanji`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement the schedule**

`lib/kanji/schedule.ts`:

```ts
export type StrokeTiming = { delay: number; duration: number };

/** speed is KanjiVG units (0-109 box) per second. */
export function strokeSchedule(lengths: number[], { speed = 260, minMs = 140, gapMs = 70 } = {}): StrokeTiming[] {
  let t = 0;
  return lengths.map((len) => {
    const duration = Math.max(minMs, (len / speed) * 1000);
    const timing = { delay: t, duration };
    t += duration + gapMs;
    return timing;
  });
}

export function scheduleEnd(s: StrokeTiming[]): number {
  const last = s.at(-1);
  return last ? last.delay + last.duration : 0;
}
```

- [ ] **Step 4: Implement the components**

`components/kanji/StrokeKanji.tsx`:

```tsx
"use client";
import { useEffect, useId, useRef, useState } from "react";
import { getStrokes } from "@/lib/kanji";
import { scheduleEnd, strokeSchedule } from "@/lib/kanji/schedule";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./StrokeKanji.module.css";

export type StrokeMode = "idle" | "write" | "done";

type Props = { char: string; mode: StrokeMode; label?: string; onDone?: () => void; className?: string };

const MASK_WIDEN_MS = 350;
const PEN_FADE_DELAY = 150;
const PEN_FADE_MS = 600;
const EASE = "cubic-bezier(.45,.05,.35,1)";

export function StrokeKanji({ char, mode, label, onDone, className }: Props) {
  const strokes = getStrokes(char);
  const tier = useMotionTier();
  const svgRef = useRef<SVGSVGElement>(null);
  const onDoneRef = useRef(onDone);
  const [finished, setFinished] = useState(false);
  const maskId = `kanji-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const phase: StrokeMode = tier === "none" || (mode === "write" && finished) ? "done" : mode;

  useEffect(() => {
    if (tier === "none" || mode !== "write") return;
    const svg = svgRef.current;
    if (!svg) return;
    setFinished(false);
    const pens = [...svg.querySelectorAll<SVGPathElement>("[data-pen]")];
    const masks = [...svg.querySelectorAll<SVGPathElement>("[data-mask]")];
    const penGroup = svg.querySelector<SVGGElement>("[data-pen-group]");
    const plan = strokeSchedule(pens.map((p) => p.getTotalLength()));
    const end = scheduleEnd(plan);

    const anims: Animation[] = [];
    plan.forEach(({ delay, duration }, i) => {
      for (const el of [pens[i], masks[i]]) {
        anims.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay, duration, easing: EASE, fill: "both" }));
      }
    });
    for (const m of masks) anims.push(m.animate([{ strokeWidth: 15 }, { strokeWidth: 40 }], { delay: end, duration: MASK_WIDEN_MS, fill: "forwards" }));
    if (penGroup) anims.push(penGroup.animate([{ opacity: 1 }, { opacity: 0 }], { delay: end + PEN_FADE_DELAY, duration: PEN_FADE_MS, fill: "forwards" }));

    const timer = window.setTimeout(() => {
      setFinished(true);
      onDoneRef.current?.();
    }, end + PEN_FADE_DELAY + PEN_FADE_MS);

    return () => {
      window.clearTimeout(timer);
      anims.forEach((a) => a.cancel());
    };
  }, [tier, mode, char]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 109 109"
      className={[styles.kanji, className].filter(Boolean).join(" ")}
      data-phase={phase}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-20" y="-20" width="149" height="149">
          <g className={styles.mask}>
            {strokes.map((d, i) => (
              <path key={i} d={d} pathLength={1} strokeDasharray="1 1" data-mask />
            ))}
          </g>
        </mask>
      </defs>
      <text x="54.5" y="56" textAnchor="middle" dominantBaseline="central" className={styles.glyph} mask={`url(#${maskId})`} lang="ja">
        {char}
      </text>
      <g className={styles.pen} data-pen-group>
        {strokes.map((d, i) => (
          <path key={i} d={d} pathLength={1} strokeDasharray="1 1" data-pen />
        ))}
      </g>
    </svg>
  );
}
```

`getTotalLength()` returns the real geometric length even with `pathLength={1}`. `pathLength` only normalises the dash maths, so durations still scale with real stroke length.

`components/kanji/StrokeKanji.module.css`:

```css
.kanji { width: 100%; height: auto; overflow: visible; color: inherit; }
.glyph { font-family: var(--font-brush), serif; font-size: 96px; fill: currentColor; }
.pen path { fill: none; stroke: currentColor; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.mask path { fill: none; stroke: #fff; stroke-width: 15; stroke-linecap: round; stroke-linejoin: round; }

.kanji[data-phase="idle"] path,
.kanji[data-phase="write"] path { stroke-dashoffset: 1; }
.kanji[data-phase="done"] .pen { opacity: 0; }
.kanji[data-phase="done"] .mask path { stroke-dashoffset: 0; stroke-width: 40; }

/* Before hydration, reduced-motion visitors already see finished glyphs. */
@media (prefers-reduced-motion: reduce) {
  .kanji .mask path { stroke-dashoffset: 0; stroke-width: 40; }
  .kanji .pen { opacity: 0; }
}
```

`components/kanji/StrokeWord.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { StrokeKanji, type StrokeMode } from "./StrokeKanji";

type Props = { text: string; mode: StrokeMode; onDone?: () => void; className?: string; charClassName?: string };

export function StrokeWord({ text, mode, onDone, className, charClassName }: Props) {
  const chars = [...text];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (mode !== "write") setIndex(0);
  }, [mode]);

  const modeFor = (i: number): StrokeMode => (mode !== "write" ? mode : i < index ? "done" : i === index ? "write" : "idle");
  const next = (i: number) => () => (i === chars.length - 1 ? onDone?.() : setIndex(i + 1));

  return (
    <span className={className} aria-hidden="true">
      {chars.map((ch, i) => (
        <StrokeKanji key={`${ch}-${i}`} char={ch} mode={modeFor(i)} onDone={i === index ? next(i) : undefined} className={charClassName} />
      ))}
    </span>
  );
}
```

`components/kanji/StrokeKanjiInView.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { useInViewOnce } from "@/lib/motion/useInViewOnce";
import { StrokeKanji } from "./StrokeKanji";

export function StrokeKanjiInView({ char, label, className }: { char: string; label?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInViewOnce(ref);
  return (
    <span ref={ref} className={className}>
      <StrokeKanji char={char} label={label} mode={seen ? "write" : "idle"} />
    </span>
  );
}
```

- [ ] **Step 5: No-JS fallback**

The `data-*` hooks don't change with CSS-module hashing. Add this to `<head>` in `app/layout.tsx` (add a `<head>` element if there isn't one):

```tsx
<noscript>
  <style>{`[data-mask]{stroke-dashoffset:0!important;stroke-width:40px!important}[data-pen-group]{opacity:0!important}`}</style>
</noscript>
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run`. Expected: PASS.

- [ ] **Step 7: Look at it**

Temporarily render `<StrokeKanji char="趣" mode="write" />` in `app/page.tsx` and run `npm run dev`. Compare it with row "A + B" of the [Stroke Order Test](https://claude.ai/artifact/C1JND9ADnBKzTxViszZEgg). Check that the pen leads, the brush glyph fills behind it, and the pen fades at the end. Remove the temporary render before committing.

- [ ] **Step 8: Commit**

```bash
git add lib/kanji/schedule.ts lib/kanji/schedule.test.ts components/kanji app/layout.tsx
git commit -m "feat: write kanji in real stroke order with a pen line and brush finish" -m "The owner chose row A+B: the pen motion of A over the brush glyph of B. The mask follows KanjiVG strokes so the glyph appears in stroke order, then widens to cover the font's own shape. Finished glyphs are the CSS default, so reduced motion and no-JS both read correctly." -m "Verified: unit tests for scheduling, sequencing, labels, and cancel on a live tier change; compared against the prototype in the browser."
```

---

### Task 7: Shared transitions: ink bleed, brush divider, seal stamp

**Files:**
- Create: `lib/cx.ts`, `components/motion/InkBleed.tsx`, `components/motion/BrushDivider.tsx`, `components/motion/BrushDivider.module.css`, `components/motion/SealStamp.tsx`, `components/motion/SealStamp.module.css`, `components/motion/transitions.test.tsx`
- Modify: `app/globals.css` (the `.ink-mask` utility)

**Interfaces:**
- Consumes: `gsap`, `useGSAP` (Task 5), `useMotionTier`, `SEASONS`, `SeasonId`.
- Produces:
  - `cx(...classes: (string | false | null | undefined)[]): string`
  - `<InkBleed origin?: "center" | "random" className? start?: string>{children}</InkBleed>`. It animates `--r` 0%→150% once on scroll.
  - `<BrushDivider from: SeasonId to: SeasonId seal: string />`, which paints a paper gradient between two season papers, draws a brush stroke and ends in a seal.
  - `<SealStamp decorative? lang? size?: "md" | "sm" className?>{children}</SealStamp>`, which presses in once on scroll.
  - The global `.ink-mask` class (used by InkBleed and by the hero mountains in Tasks 8 and 11).

- [ ] **Step 1: Write the failing tests**

`components/motion/transitions.test.tsx`:

```tsx
import { act, render } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { expect, test } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { BrushDivider } from "./BrushDivider";
import { InkBleed } from "./InkBleed";
import { SealStamp } from "./SealStamp";

let setTier: (t: MotionTier) => void = () => {};
function Harness({ children }: { children: ReactNode }) {
  const [tier, set] = useState<MotionTier>("full");
  setTier = set;
  return <MotionTierContext.Provider value={tier}>{children}</MotionTierContext.Provider>;
}

test("InkBleed starts hidden in full motion and reverts to fully shown on reduced motion", () => {
  const { container } = render(<Harness><InkBleed>print</InkBleed></Harness>);
  const el = container.querySelector<HTMLElement>("[data-ink-bleed]")!;
  expect(el.style.getPropertyValue("--r")).toBe("0%");
  act(() => setTier("none"));
  expect(el.style.getPropertyValue("--r")).toBe("");
});

test("InkBleed does nothing under reduced motion", () => {
  const { container } = render(<MotionTierContext.Provider value="none"><InkBleed>print</InkBleed></MotionTierContext.Provider>);
  expect(container.querySelector<HTMLElement>("[data-ink-bleed]")!.style.getPropertyValue("--r")).toBe("");
});

test("decorative seals are hidden from assistive tech and marked Japanese", () => {
  const { container } = render(<MotionTierContext.Provider value="none"><SealStamp decorative lang="ja">春</SealStamp></MotionTierContext.Provider>);
  const seal = container.firstElementChild!;
  expect(seal).toHaveAttribute("aria-hidden", "true");
  expect(seal).toHaveAttribute("lang", "ja");
});

test("content seals (toolbox) stay readable", () => {
  const { getByText } = render(<MotionTierContext.Provider value="none"><SealStamp size="sm">TypeScript</SealStamp></MotionTierContext.Provider>);
  expect(getByText("TypeScript")).not.toHaveAttribute("aria-hidden");
});

test("BrushDivider is decorative and blends the two season papers", () => {
  const { container } = render(<MotionTierContext.Provider value="none"><BrushDivider from="spring" to="summer-night" seal="夏" /></MotionTierContext.Provider>);
  const div = container.firstElementChild as HTMLElement;
  expect(div).toHaveAttribute("aria-hidden", "true");
  expect(div.style.getPropertyValue("--from")).toBe("#f3e7e1");
  expect(div.style.getPropertyValue("--to")).toBe("#18203a");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run components/motion`. Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/cx.ts`:

```ts
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

Append to `app/globals.css`:

```css
/* Ink bleed: a radial reveal driven by --r. The final state (150%) is the default. */
.ink-mask {
  --x: 50%; --y: 50%; --r: 150%;
  -webkit-mask-image: radial-gradient(circle at var(--x) var(--y), #000 var(--r), transparent calc(var(--r) + 12%));
  mask-image: radial-gradient(circle at var(--x) var(--y), #000 var(--r), transparent calc(var(--r) + 12%));
}
```

`components/motion/InkBleed.tsx`:

```tsx
"use client";
import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";

type Props = { children: ReactNode; origin?: "center" | "random"; className?: string; start?: string };

export function InkBleed({ children, origin = "center", className, start = "top 85%" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none" || !ref.current) return;
      const [x, y] = origin === "random" ? [15 + Math.random() * 70, 15 + Math.random() * 70] : [50, 50];
      gsap.fromTo(
        ref.current,
        { "--x": `${x}%`, "--y": `${y}%`, "--r": "0%" },
        { "--r": "150%", duration: 1.1, ease: "power2.out", scrollTrigger: { trigger: ref.current, start, once: true } },
      );
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={cx("ink-mask", className)} data-ink-bleed>
      {children}
    </div>
  );
}
```

`components/motion/SealStamp.tsx`:

```tsx
"use client";
import { useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./SealStamp.module.css";

type Props = { children: ReactNode; decorative?: boolean; lang?: string; size?: "md" | "sm"; className?: string };

export function SealStamp({ children, decorative = false, lang, size = "md", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none" || !ref.current) return;
      gsap.from(ref.current, {
        scale: 1.8, rotate: -10, autoAlpha: 0, duration: 0.45, ease: "back.out(2.2)",
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <span ref={ref} lang={lang} aria-hidden={decorative || undefined} className={cx(styles.seal, styles[size], className)}>
      {children}
    </span>
  );
}
```

`components/motion/SealStamp.module.css`:

```css
.seal {
  display: inline-grid; place-items: center;
  background: var(--seal); color: #fff;
  font-family: var(--font-brush), serif; line-height: 1;
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.28), 0 1px 0 rgb(0 0 0 / 0.2);
  transform-origin: 50% 50%;
}
.md { width: 2.4rem; height: 2.4rem; font-size: 1.5rem; }
.sm { padding: 0.3rem 0.6rem; font-family: var(--font-heading), serif; font-size: 0.85rem; letter-spacing: 0.02em; }
```

`components/motion/BrushDivider.tsx`:

```tsx
"use client";
import { useRef, type CSSProperties } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { SEASONS, type SeasonId } from "@/lib/seasons";
import { SealStamp } from "./SealStamp";
import styles from "./BrushDivider.module.css";

const STROKE = "M10 34 C 130 18, 260 46, 420 31 S 700 21, 860 33";

export function BrushDivider({ from, to, seal }: { from: SeasonId; to: SeasonId; seal: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const vars = { "--from": SEASONS[from].paper, "--to": SEASONS[to].paper, "--stroke": SEASONS[to].ink } as CSSProperties;

  useGSAP(
    () => {
      if (tier === "none" || !ref.current) return;
      gsap.fromTo(ref.current.querySelectorAll("path"), { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut", stagger: 0.15,
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.divider} style={vars} aria-hidden="true">
      <svg viewBox="0 0 900 60" preserveAspectRatio="none" className={styles.svg}>
        <path d={STROKE} pathLength={1} strokeDasharray="1 1" className={styles.main} />
        <path d={STROKE} pathLength={1} strokeDasharray="1 1" className={styles.dry} transform="translate(6 5)" />
      </svg>
      <SealStamp decorative lang="ja" className={styles.seal}>{seal}</SealStamp>
    </div>
  );
}
```

`components/motion/BrushDivider.module.css`:

```css
.divider {
  position: relative;
  display: flex; align-items: center; gap: 1rem;
  padding: 3rem clamp(1rem, 6vw, 6rem);
  background: linear-gradient(var(--from), var(--to));
}
.svg { flex: 1; height: 3.5rem; overflow: visible; }
.main, .dry { fill: none; stroke: var(--stroke); stroke-linecap: round; stroke-dashoffset: 0; }
.main { stroke-width: 7; }
.dry { stroke-width: 2; opacity: 0.45; }
.seal { flex: none; }
```

The divider's stroke uses the *incoming* season's ink, so it also reads on the dark Events paper.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run`. Expected: PASS. If the InkBleed revert test fails because ScrollTrigger in jsdom defers the from-state, add `immediateRender: true` to the `fromTo` vars. Don't weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add lib/cx.ts components/motion app/globals.css
git commit -m "feat: add the shared ink bleed, brush divider and seal stamp transitions" -m "These three moves are used across every chapter, so they live once with the motion contract built in: final state in CSS, animate from hidden, revert on tier change. The divider blends season papers statically so text contrast never depends on a tween." -m "Verified: unit tests including revert to final state on a live reduced-motion switch."
```

---

### Task 8: Scroll frame, page skeleton, hero and footer

**Files:**
- Create: `lib/motion/mountains.ts`, `lib/motion/mountains.test.ts`, `components/frame/ScrollFrame.tsx`, `components/frame/ScrollFrame.module.css`, `components/frame/Footer.tsx`, `components/frame/Footer.module.css`, `components/chapters/ChapterSection.tsx`, `components/chapters/ChapterSection.module.css`, `components/chapters/ChapterBody.tsx`, `components/hero/Hero.tsx`, `components/hero/Hero.module.css`, `components/hero/HeroName.tsx`, `components/hero/InkMountains.tsx`, `components/Photo.tsx`, `e2e/structure.spec.ts`
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- Delete: `e2e/smoke.spec.ts` (superseded)

**Interfaces:**
- Consumes: `getContent`, `visibleChapters`, `Chapter`, `seasonVars`, `SeasonId`, `StrokeKanjiInView`, `StrokeWord`, `BrushDivider`, `SealStamp`, `Ja`, `cx`, `mulberry32`.
- Produces:
  - `mountainPath(seed: number, width: number, height: number, peaks: number): string`
  - `<ScrollFrame>{children}</ScrollFrame>`, `<Roller />`, `<Footer />`
  - `<ChapterSection chapter>{children}</ChapterSection>`, which renders `section#<id>` with `h2#<id>-title[data-chapter-heading][tabindex=-1]`
  - `<ChapterBody id content />`, a switch that each chapter task fills in
  - `<Hero chapters />` with `header#top[data-hero]`, `[data-unroll-roller]`, `[data-hero-mountains]`, `[data-hero-menu]`, `[data-hero-name]`
  - `<Photo photo sizes className? />`

- [ ] **Step 1: Write the failing tests**

`lib/motion/mountains.test.ts`:

```ts
import { expect, test } from "vitest";
import { mountainPath } from "./mountains";

test("deterministic per seed, closed, inside the box", () => {
  const a = mountainPath(7, 1200, 400, 6);
  expect(a).toBe(mountainPath(7, 1200, 400, 6));
  expect(a).not.toBe(mountainPath(8, 1200, 400, 6));
  expect(a.startsWith("M0 400")).toBe(true);
  expect(a.endsWith("Z")).toBe(true);
  const ys = [...a.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
  for (const y of ys) {
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(400);
  }
});
```

`e2e/structure.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" }); // judge final states

const CHAPTERS = [["about", "About"], ["events", "Events"], ["music", "Music"], ["hobbies", "Hobbies"], ["shelf", "Shelf"], ["people", "People"]];

test("one h1, one h2 per chapter, each heading owns its section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveAccessibleName("Miel");
  for (const [id, label] of CHAPTERS) await expect(page.locator(`section#${id} h2`)).toHaveAccessibleName(label);
  await expect(page.locator("h2")).toHaveCount(6);
});

test("first Tab reaches the skip link, which moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("a second skip link goes to the plain index", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to the plain index" })).toBeFocused();
});

test("footer credits KanjiVG and ends on 終", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "KanjiVG" })).toHaveAttribute("href", "http://kanjivg.tagaini.net");
  await expect(page.getByRole("img", { name: "The end" })).toBeVisible();
});

test("no portrait in the hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-hero] img")).toHaveCount(0);
});

test("home has no axe violations at WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/motion/mountains.test.ts && npx playwright test e2e/structure.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Mountains and Photo**

`lib/motion/mountains.ts`:

```ts
import { mulberry32 } from "@/lib/random";

/** A closed silhouette of soft peaks, for layered ink mountains. */
export function mountainPath(seed: number, width: number, height: number, peaks: number): string {
  const rand = mulberry32(seed);
  const step = width / peaks;
  const clamp = (y: number) => Math.min(height, Math.max(0, y));
  let d = `M0 ${height}`;
  for (let i = 0; i <= peaks; i++) {
    const x = i * step;
    const y = clamp(height * (0.3 + rand() * 0.45));
    if (i === 0) d += ` L0 ${y.toFixed(1)}`;
    else d += ` Q${(x - step / 2).toFixed(1)} ${clamp(y - height * 0.3 * rand()).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L${width} ${height} Z`;
}
```

`components/Photo.tsx`:

```tsx
import Image from "next/image";
import type { Photo as PhotoData } from "@/lib/content/schema";

type Props = { photo: PhotoData; sizes: string; className?: string };

export function Photo({ photo, sizes, className }: Props) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      className={className}
      // Fixture swatches are data: URIs, which the optimiser can't process.
      unoptimized={photo.src.startsWith("data:")}
    />
  );
}
```

- [ ] **Step 4: Frame and footer**

`components/frame/ScrollFrame.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./ScrollFrame.module.css";

export function Roller() {
  return (
    <div className={styles.roller} aria-hidden="true">
      <span className={styles.cap} />
      <span className={styles.cap} />
    </div>
  );
}

export function ScrollFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wall}>
      <div className={styles.hang} data-scroll-frame>
        <div className={styles.cord} aria-hidden="true" />
        <Roller />
        <div className={styles.brocade}>
          <div className={styles.paper}>{children}</div>
        </div>
      </div>
    </div>
  );
}
```

`components/frame/ScrollFrame.module.css`:

```css
.wall { min-height: 100vh; padding: 2.5rem clamp(0.5rem, 3vw, 3rem) 0; }
.hang { position: relative; max-width: 1180px; margin: 0 auto; }
.cord {
  width: 46%; height: 2.4rem; margin: 0 auto -0.35rem;
  border: 2px solid #8a6b3a; border-bottom: none;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.roller {
  position: relative; z-index: 2;
  height: 1.6rem; margin: 0 -1.4rem;
  border-radius: 0.8rem;
  background: linear-gradient(#5b3a22, #8a5a35 40%, #3d2414);
  box-shadow: 0 6px 14px rgb(0 0 0 / 0.35);
}
.cap {
  position: absolute; top: -0.25rem;
  width: 1.8rem; height: 2.1rem; border-radius: 0.5rem;
  background: linear-gradient(#f6f0e2, #cfc4ac);
}
.cap:first-child { left: -1.2rem; }
.cap:last-child { right: -1.2rem; }
.brocade {
  padding: clamp(0.6rem, 2.4vw, 2.25rem);
  background-color: var(--brocade);
  background-image:
    repeating-linear-gradient(45deg, transparent 0 14px, color-mix(in srgb, var(--gold) 38%, transparent) 14px 15px),
    repeating-linear-gradient(-45deg, transparent 0 14px, color-mix(in srgb, var(--gold) 38%, transparent) 14px 15px);
}
.paper {
  position: relative;
  background-color: var(--paper);
  background-image:
    radial-gradient(circle at 12% 18%, rgb(120 84 40 / 0.08) 0 2.5rem, transparent 3rem),
    radial-gradient(circle at 86% 42%, rgb(120 84 40 / 0.06) 0 1.8rem, transparent 2.4rem),
    radial-gradient(circle at 30% 77%, rgb(120 84 40 / 0.07) 0 2rem, transparent 2.6rem),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .22 0 0 0 0 .12 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  color: var(--ink);
}
```

`components/frame/Footer.tsx`:

```tsx
import Link from "next/link";
import { Ja } from "@/components/Ja";
import { StrokeKanjiInView } from "@/components/kanji/StrokeKanjiInView";
import { Roller } from "./ScrollFrame";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.end}>
        <StrokeKanjiInView char="終" label="The end" className={styles.owari} />
      </div>
      <div className={styles.meta}>
        <p>
          Stroke order data: <a href="http://kanjivg.tagaini.net">KanjiVG</a> by Ulrich Apel,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Fonts from Google Fonts under the OFL.
        </p>
        <p>
          <Link href="/mokuroku">Plain index <Ja aria-hidden="true">目録</Ja></Link>
        </p>
        {/* Task 20 adds <SoundToggle /> here. */}
      </div>
      <div className={styles.bottom}>
        <Roller />
      </div>
    </footer>
  );
}
```

`components/frame/Footer.module.css`:

```css
.footer { padding: 4rem clamp(1rem, 6vw, 6rem) 0; display: grid; gap: 2rem; }
.end { display: grid; place-items: center; }
.owari { display: block; width: clamp(5rem, 12vw, 8rem); }
.meta { font-size: 0.875rem; color: var(--muted); text-align: center; }
.meta p { margin: 0.25rem 0; }
.bottom { margin: 2rem calc(-1 * clamp(1rem, 6vw, 6rem)) 0; }
```

- [ ] **Step 5: Chapter section and body switch**

`components/chapters/ChapterSection.tsx`:

```tsx
import type { ReactNode } from "react";
import { StrokeKanjiInView } from "@/components/kanji/StrokeKanjiInView";
import { SealStamp } from "@/components/motion/SealStamp";
import type { Chapter } from "@/lib/chapters";
import { seasonVars } from "@/lib/seasons";
import styles from "./ChapterSection.module.css";

export function ChapterSection({ chapter, children }: { chapter: Chapter; children: ReactNode }) {
  const titleId = `${chapter.id}-title`;
  return (
    <section id={chapter.id} aria-labelledby={titleId} className={styles.chapter} style={seasonVars(chapter.season)} data-chapter={chapter.id}>
      <header className={styles.head}>
        <StrokeKanjiInView char={chapter.kanji} className={styles.kanji} />
        <h2 id={titleId} tabIndex={-1} data-chapter-heading className={styles.title}>
          {chapter.label}
          <SealStamp decorative lang="ja" className={styles.seal}>{chapter.kanji}</SealStamp>
        </h2>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
```

`components/chapters/ChapterSection.module.css`:

```css
.chapter {
  background: var(--paper); color: var(--ink);
  padding: clamp(2rem, 6vw, 5rem) clamp(1rem, 6vw, 6rem) clamp(3rem, 8vw, 6rem);
  scroll-margin-top: 1rem;
}
.head { display: flex; align-items: center; gap: clamp(1rem, 3vw, 2.5rem); margin-bottom: clamp(2rem, 5vw, 3.5rem); }
.kanji { display: block; width: clamp(5.5rem, 12vw, 9rem); flex: none; }
.title { display: inline-flex; align-items: center; gap: 0.9rem; margin: 0; font-size: clamp(2rem, 4.5vw, 3.25rem); }
.title:focus-visible { outline-offset: 8px; }
.body { max-width: 68rem; }
```

`components/chapters/ChapterBody.tsx`. Each chapter task replaces one `null`:

```tsx
import type { ChapterId } from "@/lib/chapters";
import type { SiteContent } from "@/lib/content/schema";

export function ChapterBody({ id, content }: { id: ChapterId; content: SiteContent }) {
  void content; // used once the chapter components land (Tasks 13-19)
  switch (id) {
    case "about":
      return null; // Task 13
    case "events":
      return null; // Task 14
    case "music":
      return null; // Task 16
    case "hobbies":
      return null; // Task 17
    case "shelf":
      return null; // Task 18
    case "people":
      return null; // Task 19
  }
}
```

Task 13 removes the `void content;` line.

- [ ] **Step 6: Hero**

`components/hero/InkMountains.tsx`:

```tsx
import { cx } from "@/lib/cx";
import { mountainPath } from "@/lib/motion/mountains";

const LAYERS = [
  { seed: 7, peaks: 5, opacity: 0.16, offset: 0 },
  { seed: 19, peaks: 7, opacity: 0.3, offset: 40 },
  { seed: 41, peaks: 9, opacity: 0.55, offset: 90 },
];

export function InkMountains({ className }: { className?: string }) {
  return (
    <div className={cx("ink-mask", className)} data-hero-mountains aria-hidden="true">
      <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
        {LAYERS.map((l) => (
          <path key={l.seed} d={mountainPath(l.seed, 1200, 400 - l.offset, l.peaks)} transform={`translate(0 ${l.offset})`} fill="var(--ink)" opacity={l.opacity} />
        ))}
      </svg>
    </div>
  );
}
```

`components/hero/HeroName.tsx`. Task 11 replaces the mode source with the entrance phase:

```tsx
"use client";
import { StrokeWord } from "@/components/kanji/StrokeWord";
import styles from "./Hero.module.css";

export function HeroName() {
  return <StrokeWord text="ミエル" mode="write" className={styles.kana} charClassName={styles.kanaChar} />;
}
```

`components/hero/Hero.tsx`:

```tsx
import { Ja } from "@/components/Ja";
import type { Chapter } from "@/lib/chapters";
import { HeroName } from "./HeroName";
import { InkMountains } from "./InkMountains";
import styles from "./Hero.module.css";

export function Hero({ chapters }: { chapters: Chapter[] }) {
  return (
    <header id="top" className={styles.hero} data-hero>
      <div className={styles.unrollRoller} data-unroll-roller aria-hidden="true" />
      <InkMountains className={styles.mountains} />
      <h1 className={styles.name} data-hero-name>
        <HeroName />
        <span className={styles.nameEn}>Miel</span>
      </h1>
      {chapters.length > 0 && (
        <nav aria-label="Chapters" className={styles.menu} data-hero-menu>
          <ol>
            {chapters.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className={styles.item}>
                  <Ja aria-hidden="true" className={styles.column}>{c.kanji}</Ja>
                  <span className={styles.label}>{c.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
```

`components/hero/Hero.module.css`:

```css
.hero {
  position: relative; overflow: hidden;
  min-height: min(92vh, 60rem);
  display: grid; grid-template-rows: 1fr auto; justify-items: center;
  padding: clamp(3rem, 8vh, 6rem) clamp(1rem, 6vw, 6rem) clamp(2rem, 6vh, 4rem);
}
.mountains { position: absolute; inset: auto 0 0 0; height: 55%; pointer-events: none; }
.unrollRoller {
  position: absolute; top: 0; left: -1rem; right: -1rem; z-index: 3; height: 1.6rem;
  border-radius: 0.8rem; background: linear-gradient(#5b3a22, #8a5a35 40%, #3d2414);
  opacity: 0;
}
.name { position: relative; margin: 0; display: grid; justify-items: center; gap: 0.5rem; align-self: center; }
.kana { display: flex; gap: 0.25rem; }
.kanaChar { width: clamp(4.5rem, 11vw, 8.5rem); }
.nameEn { font-size: clamp(1.25rem, 2.4vw, 1.75rem); letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); }
.menu { position: relative; }
.menu ol { list-style: none; margin: 0; padding: 0; display: flex; gap: clamp(1rem, 4vw, 3.5rem); }
.item { display: grid; justify-items: center; gap: 0.6rem; text-decoration: none; padding: 0.5rem; border-radius: 4px; }
.column { writing-mode: vertical-rl; font-family: var(--font-brush), serif; font-size: clamp(2.5rem, 5vw, 4rem); line-height: 1; transition: color 0.2s, transform 0.2s; }
.label { font-family: var(--font-heading), serif; font-size: 0.95rem; letter-spacing: 0.08em; }
.item:hover .column, .item:focus-visible .column { color: var(--seal); transform: translateY(-4px); }
@media (max-width: 767px) {
  .menu ol { flex-wrap: wrap; justify-content: center; }
}
```

- [ ] **Step 7: Assemble the page, skip links and layout**

`app/page.tsx`:

```tsx
import { Fragment } from "react";
import { ChapterBody } from "@/components/chapters/ChapterBody";
import { ChapterSection } from "@/components/chapters/ChapterSection";
import { Footer } from "@/components/frame/Footer";
import { ScrollFrame } from "@/components/frame/ScrollFrame";
import { Hero } from "@/components/hero/Hero";
import { BrushDivider } from "@/components/motion/BrushDivider";
import { visibleChapters } from "@/lib/chapters";
import { getContent } from "@/lib/content/load";

export default async function Home() {
  const content = await getContent();
  const chapters = visibleChapters(content);

  return (
    <ScrollFrame>
      <Hero chapters={chapters} />
      <main id="main" tabIndex={-1}>
        {chapters.map((chapter, i) => (
          <Fragment key={chapter.id}>
            <BrushDivider from={i === 0 ? "top" : chapters[i - 1].season} to={chapter.season} seal={chapter.seal} />
            <ChapterSection chapter={chapter}>
              <ChapterBody id={chapter.id} content={content} />
            </ChapterSection>
          </Fragment>
        ))}
      </main>
      <Footer />
    </ScrollFrame>
  );
}
```

In `app/layout.tsx`, put the skip links first in `<body>`:

```tsx
<body>
  <a className="skip-link" href="#main">Skip to content</a>
  <a className="skip-link" href="/mokuroku">Skip to the plain index</a>
  <MotionProvider>{children}</MotionProvider>
</body>
```

Append to `app/globals.css`:

```css
.skip-link {
  position: absolute; left: 1rem; top: -4rem; z-index: 100;
  padding: 0.6rem 1rem; border-radius: 4px;
  background: var(--paper); color: var(--ink); font-weight: 700;
}
.skip-link:focus { top: 1rem; }
main:focus { outline: none; }
main:focus-visible { outline: 3px solid var(--focus); outline-offset: -3px; }
```

- [ ] **Step 8: Run everything**

Run: `npm run typecheck && npx vitest run && npx playwright test`. Expected: PASS. Every chapter has a heading, even though its body is still `null`. If axe flags contrast, fix the token in `lib/seasons.ts` and re-run the season tests; don't suppress the rule.

- [ ] **Step 9: Look at it**

Run `npm run dev:fixtures` and compare with the [Hanging Scroll Prototype](https://claude.ai/artifact/TQ2i5qduuGUpc8pBe2PVn5): the cord, the rollers with caps, the brocade lattice, the paper with faint foxing, the hero mountains, and ミエル written above "Miel". Then run `npm run dev` with the real empty seed and confirm the page shows the hero (with no menu), the footer and 終, and no empty sections.

- [ ] **Step 10: Commit**

```bash
git rm e2e/smoke.spec.ts
git add lib/motion/mountains.ts lib/motion/mountains.test.ts components app e2e
git commit -m "feat: build the hanging-scroll frame, hero, chapter sections and footer" -m "This is the skeleton every chapter plugs into: frame, menu hero with ミエル written in, one section per visible chapter with its season paper, brush dividers, and the 終 roller with the KanjiVG credit. Skip links to main and the plain index come first." -m "Verified: typecheck, unit tests, e2e structure and axe WCAG 2.1 AA on fixtures; empty seed renders hero and footer only."
```

---

### Task 9: Smooth scroll and hash navigation

**Files:**
- Create: `lib/motion/navigate.ts`, `lib/motion/navigate.test.ts`, `components/motion/SmoothScroll.tsx`, `components/motion/HashLinks.tsx`, `e2e/navigation.spec.ts`
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `useMotionTier`, `gsap`, `ScrollTrigger`.
- Produces:
  - `setLenis(l: Lenis | null): void`, `getLenis(): Lenis | null`
  - `scrollToId(id: string, opts?: { push?: boolean; immediate?: boolean }): boolean`. It scrolls (through Lenis when active), focuses the target's `[data-chapter-heading]` or the target itself, and pushes `#id` to history. It returns `false` when no element has that id.
  - `<SmoothScroll />`: Lenis only at tier `full` and never on `/mokuroku`.
  - `<HashLinks />`: handles same-page anchor clicks, cold deep links and back/forward.

- [ ] **Step 1: Write the failing tests**

`lib/motion/navigate.test.ts`:

```ts
import { afterEach, expect, test, vi } from "vitest";
import { scrollToId, setLenis } from "./navigate";

afterEach(() => {
  document.body.innerHTML = "";
  setLenis(null);
  history.replaceState(null, "", "/");
});

function chapter() {
  document.body.innerHTML = `<section id="music"><h2 data-chapter-heading tabindex="-1">Music</h2></section><main id="main" tabindex="-1"></main>`;
  Element.prototype.scrollIntoView = vi.fn();
}

test("focuses the chapter heading and updates the hash", () => {
  chapter();
  expect(scrollToId("music")).toBe(true);
  expect(document.activeElement?.textContent).toBe("Music");
  expect(location.hash).toBe("#music");
});

test("targets without a heading get focus themselves", () => {
  chapter();
  scrollToId("main");
  expect(document.activeElement?.id).toBe("main");
});

test("unknown ids do nothing", () => {
  chapter();
  expect(scrollToId("nope")).toBe(false);
  expect(location.hash).toBe("");
});

test("uses Lenis when active and focuses on completion", () => {
  chapter();
  const scrollTo = vi.fn((_el: unknown, opts: { onComplete?: () => void }) => opts.onComplete?.());
  setLenis({ scrollTo } as never);
  scrollToId("music", { push: false });
  expect(scrollTo).toHaveBeenCalledOnce();
  expect(document.activeElement?.textContent).toBe("Music");
  expect(location.hash).toBe("");
});
```

`e2e/navigation.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

async function headingAtTop(page: Page, id: string) {
  const top = () => page.locator(`#${id}-title`).evaluate((el) => el.getBoundingClientRect().top);
  await expect.poll(top).toBeLessThan(200);
  await expect.poll(top).toBeGreaterThanOrEqual(0);
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("a cold deep link lands on the chapter with focus on its heading", async ({ page }) => {
      await page.goto("/#music");
      await headingAtTop(page, "music");
      await expect(page.locator("#music-title")).toBeFocused();
    });

    test("menu links scroll, focus and update the URL", async ({ page }) => {
      await page.goto("/#top");
      await page.locator("[data-hero-menu]").getByRole("link", { name: "Hobbies" }).click();
      await headingAtTop(page, "hobbies");
      await expect(page.locator("#hobbies-title")).toBeFocused();
      await expect(page).toHaveURL(/#hobbies$/);
    });

    // Uses key 6 from Task 10: write it as test.fixme now and remove the fixme in Task 10.
    test.fixme("back returns to the previous chapter", async ({ page }) => {
      await page.goto("/#about");
      await page.keyboard.press("6");
      await headingAtTop(page, "people");
      await page.goBack();
      await headingAtTop(page, "about");
    });
  });
}

test("Lenis runs at full motion and is removed live on reduced motion", async ({ page }) => {
  await page.goto("/#top");
  await expect(page.locator("html")).toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.keyboard.press("End"); // native scrolling works again
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
});

test.fixme("no smooth scrolling on the plain index (enable in Task 21)", async ({ page }) => {
  await page.goto("/mokuroku");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
});
```

The `#top` hash keeps the entrance (Task 11) from interfering.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/motion/navigate.test.ts && npx playwright test e2e/navigation.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/motion/navigate.ts`:

```ts
import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(l: Lenis | null): void {
  lenis = l;
}

export function getLenis(): Lenis | null {
  return lenis;
}

function focusTarget(el: HTMLElement) {
  const target = el.querySelector<HTMLElement>("[data-chapter-heading]") ?? el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** One path for every in-page jump: menu, rail, keys, skip link, deep links. */
export function scrollToId(id: string, { push = true, immediate = false } = {}): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  if (push && location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
  if (lenis) {
    lenis.scrollTo(el, { immediate, onComplete: () => focusTarget(el) });
  } else {
    el.scrollIntoView({ block: "start", behavior: immediate ? "instant" : "auto" });
    focusTarget(el);
  }
  return true;
}
```

`components/motion/SmoothScroll.tsx`:

```tsx
"use client";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { setLenis } from "@/lib/motion/navigate";

export function SmoothScroll() {
  const tier = useMotionTier();
  const pathname = usePathname();
  const enabled = tier === "full" && pathname !== "/mokuroku";

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ autoRaf: false, anchors: false, lerp: 0.1 });
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", onScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(lenis);
    return () => {
      setLenis(null);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
```

`components/motion/HashLinks.tsx`:

```tsx
"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { scrollToId } from "@/lib/motion/navigate";

const idFromHash = (hash: string) => decodeURIComponent(hash.replace(/^#/, ""));

export function HashLinks() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = link ? idFromHash(link.getAttribute("href") ?? "") : "";
      if (id && scrollToId(id)) e.preventDefault();
    };
    const onPop = () => {
      const id = idFromHash(location.hash);
      if (id) scrollToId(id, { push: false });
    };
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Cold deep links and arrivals from other pages (e.g. "Back to Events").
  useEffect(() => {
    const id = idFromHash(location.hash);
    if (!id) return;
    const raf = requestAnimationFrame(() => scrollToId(id, { push: false, immediate: true }));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
```

In `app/layout.tsx`:

```tsx
import "lenis/dist/lenis.css";
import { HashLinks } from "@/components/motion/HashLinks";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
// ...
<MotionProvider>
  <SmoothScroll />
  <HashLinks />
  {children}
</MotionProvider>
```

Check the stylesheet path with `ls node_modules/lenis/dist/*.css`. Append to `app/globals.css`, because CSS smooth scrolling fights Lenis:

```css
html.lenis { scroll-behavior: auto !important; }
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test e2e/navigation.spec.ts`. Expected: PASS, except the two tests marked `fixme`.

- [ ] **Step 5: Commit**

```bash
git add lib/motion/navigate.ts lib/motion/navigate.test.ts components/motion/SmoothScroll.tsx components/motion/HashLinks.tsx app/layout.tsx app/globals.css e2e/navigation.spec.ts
git commit -m "feat: add Lenis smooth scroll with one focus-managing jump path" -m "Every in-page jump goes through scrollToId so menu, rail, keys, skip link, deep links and back all scroll the same way and move keyboard focus to the heading. Lenis runs only at full motion and is destroyed live, returning native scroll." -m "Verified: unit tests; e2e deep link, menu links, and live Lenis teardown in both motion modes."
```

---

### Task 10: Seal rail, active chapter and keys 1–6

**Files:**
- Create: `components/motion/ActiveChapter.tsx`, `components/rail/SealRail.tsx`, `components/rail/SealRail.module.css`, `components/rail/SealRail.test.tsx`, `e2e/rail.spec.ts`
- Modify: `app/page.tsx`, `e2e/navigation.spec.ts` (remove the `fixme` on the "back" test)

**Interfaces:**
- Consumes: `Chapter`, `ChapterId`, `chapterForKey`, `shouldHandleChapterKey`, `scrollToId`, `Ja`.
- Produces:
  - `<ActiveChapterProvider ids={ChapterId[]}>`, the single IntersectionObserver for the page.
  - `useActiveChapter(): ChapterId | null` (`null` while the hero crosses the viewport's middle line). Task 12 uses it for seasons.
  - `<SealRail chapters />`

- [ ] **Step 1: Write the failing tests**

`components/rail/SealRail.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { CHAPTERS } from "@/lib/chapters";
import * as navigate from "@/lib/motion/navigate";
import { SealRail } from "./SealRail";

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
afterEach(() => vi.restoreAllMocks());

const two = [CHAPTERS[2], CHAPTERS[5]]; // music, people

test("one seal per visible chapter, numbered by rail position", () => {
  render(<SealRail chapters={two} />);
  const links = screen.getAllByRole("link", { hidden: true }).filter((a) => a.getAttribute("href")?.startsWith("#"));
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["#music", "#people"]);
  expect(links[0]).toHaveAttribute("aria-keyshortcuts", "1");
});

test("hidden (inert) until the hero leaves", () => {
  const { container } = render(<SealRail chapters={two} />);
  expect(container.querySelector("nav")).toHaveAttribute("inert");
});

test("digit keys jump by rail position", () => {
  const spy = vi.spyOn(navigate, "scrollToId").mockReturnValue(true);
  render(<SealRail chapters={two} />);
  fireEvent.keyDown(window, { key: "2" });
  expect(spy).toHaveBeenCalledWith("people");
  fireEvent.keyDown(window, { key: "3" });
  expect(spy).toHaveBeenCalledTimes(1);
});

test("modifier digits are left to the browser", () => {
  const spy = vi.spyOn(navigate, "scrollToId").mockReturnValue(true);
  render(<SealRail chapters={two} />);
  fireEvent.keyDown(window, { key: "1", ctrlKey: true });
  expect(spy).not.toHaveBeenCalled();
});

test("renders nothing for an empty site", () => {
  const { container } = render(<SealRail chapters={[]} />);
  expect(container).toBeEmptyDOMElement();
});
```

If `vi.spyOn` can't redefine the ES module export, switch to `vi.mock("@/lib/motion/navigate", () => ({ scrollToId: vi.fn(() => true) }))` and assert on that mock.

`e2e/rail.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("rail appears after the hero, marks the current chapter and jumps by key", async ({ page }) => {
  await page.goto("/#about");
  const rail = page.getByRole("navigation", { name: "Chapter rail" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("link", { name: /About/ })).toHaveAttribute("aria-current", "location");

  await page.keyboard.press("3");
  await expect(page.locator("#music-title")).toBeFocused();
  await expect(rail.getByRole("link", { name: /Music/ })).toHaveAttribute("aria-current", "location");
});

test("rail is not in the tab order while the hero is showing", async ({ page }) => {
  await page.goto("/#top");
  await expect(page.locator("nav[aria-label='Chapter rail']")).toHaveAttribute("inert", "");
});

test("rail links reach the plain index", async ({ page }) => {
  await page.goto("/#events");
  await expect(page.getByRole("navigation", { name: "Chapter rail" }).getByRole("link", { name: "Index" })).toHaveAttribute("href", "/mokuroku");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run components/rail && npx playwright test e2e/rail.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`components/motion/ActiveChapter.tsx`:

```tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ChapterId } from "@/lib/chapters";

const ActiveChapterContext = createContext<ChapterId | null>(null);
export const useActiveChapter = () => useContext(ActiveChapterContext);

/** One observer for the whole page: the chapter crossing the viewport's middle line is active. */
export function ActiveChapterProvider({ ids, children }: { ids: ChapterId[]; children: ReactNode }) {
  const [active, setActive] = useState<ChapterId | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const targets = ["top", ...key.split("|").filter(Boolean)]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id === "top" ? null : (e.target.id as ChapterId));
      },
      { rootMargin: "-50% 0px -49% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [key]);

  return <ActiveChapterContext.Provider value={active}>{children}</ActiveChapterContext.Provider>;
}
```

`components/rail/SealRail.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Ja } from "@/components/Ja";
import { useActiveChapter } from "@/components/motion/ActiveChapter";
import { chapterForKey, shouldHandleChapterKey, type Chapter } from "@/lib/chapters";
import { scrollToId } from "@/lib/motion/navigate";
import styles from "./SealRail.module.css";

export function SealRail({ chapters }: { chapters: Chapter[] }) {
  const active = useActiveChapter();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { rootMargin: "0px 0px -60% 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!shouldHandleChapterKey(e)) return;
      const chapter = chapterForKey(e.key, chapters);
      if (!chapter) return;
      e.preventDefault();
      scrollToId(chapter.id);
      // Task 20 adds playTap() here.
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chapters]);

  if (chapters.length === 0) return null;

  return (
    <nav aria-label="Chapter rail" className={styles.rail} data-shown={shown} inert={!shown}>
      <ol className={styles.list}>
        {chapters.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={styles.item} aria-current={active === c.id ? "location" : undefined} aria-keyshortcuts={String(i + 1)}>
              <Ja aria-hidden="true" className={styles.seal}>{c.kanji}</Ja>
              <span className={styles.label}>{c.label}</span>
              <kbd className={styles.key} aria-hidden="true">{i + 1}</kbd>
            </a>
          </li>
        ))}
      </ol>
      <Link href="/mokuroku" className={styles.index}>Index</Link>
    </nav>
  );
}
```

`components/rail/SealRail.module.css`:

```css
.rail {
  position: fixed; z-index: 30; right: clamp(0.5rem, 1.5vw, 1.5rem); top: 50%;
  translate: 0 -50%;
  display: grid; gap: 0.75rem; justify-items: end;
  opacity: 0; transition: opacity 0.3s ease;
}
.rail[data-shown="true"] { opacity: 1; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
.item { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; color: #f1e8d6; border-radius: 4px; }
.seal {
  display: grid; place-items: center; width: 2.6rem; height: 2.6rem; order: 2;
  font-family: var(--font-brush), serif; font-size: 1.4rem;
  border: 2px solid currentColor; border-radius: 4px; background: rgb(0 0 0 / 0.25);
  transition: background 0.2s, color 0.2s;
}
.item[aria-current] .seal { background: var(--seal); border-color: var(--seal); color: #fff; }
.label {
  order: 1; padding: 0.15rem 0.5rem; border-radius: 3px; background: rgb(0 0 0 / 0.55);
  font-size: 0.85rem; opacity: 0; translate: 6px 0; transition: opacity 0.2s, translate 0.2s;
}
.item:hover .label, .item:focus-visible .label, .item[aria-current] .label { opacity: 1; translate: 0 0; }
.key { order: 3; font: 0.7rem/1 var(--font-body), sans-serif; opacity: 0.7; }
.index { font-size: 0.8rem; color: #f1e8d6; }
.item:focus-visible, .index:focus-visible { outline-color: #f2c14e; }
@media (max-width: 767px) {
  .rail { top: auto; bottom: 0.5rem; right: 50%; translate: 50% 0; justify-items: center; }
  .list { grid-auto-flow: column; }
  .label, .key { display: none; }
}
```

The rail sits over the **wall**, which is always dark, so its colours are fixed rather than taken from the season. The gold focus ring has the contrast it needs there.

Wrap the page in `app/page.tsx` and add the rail:

```tsx
import { ActiveChapterProvider } from "@/components/motion/ActiveChapter";
import { SealRail } from "@/components/rail/SealRail";
// ...
return (
  <ActiveChapterProvider ids={chapters.map((c) => c.id)}>
    <ScrollFrame>
      <Hero chapters={chapters} />
      <SealRail chapters={chapters} />
      <main id="main" tabIndex={-1}>{/* unchanged */}</main>
      <Footer />
    </ScrollFrame>
  </ActiveChapterProvider>
);
```

In `e2e/navigation.spec.ts`, change `test.fixme("back returns to the previous chapter"` to `test(` and delete the comment above it.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test`. Expected: PASS (except the `/mokuroku` fixme).

- [ ] **Step 5: Commit**

```bash
git add components/motion/ActiveChapter.tsx components/rail app/page.tsx e2e/rail.spec.ts e2e/navigation.spec.ts
git commit -m "feat: turn the menu into a seal rail with active chapter and 1-6 keys" -m "One IntersectionObserver decides the active chapter for both the rail and (next) the season tint, so they can't disagree. Keys follow rail position so a sparse site still maps 1..n, and are ignored with modifiers or while typing. The rail is inert while the hero menu shows, to avoid two identical tab stops." -m "Verified: unit tests for keys, hiding and empty site; e2e for aria-current, key jumps and back navigation."
```

---

### Task 11: The entrance

**Files:**
- Create: `components/hero/Entrance.tsx`, `e2e/entrance.spec.ts`
- Modify: `lib/motion/tier.ts` (pre-paint script), `app/layout.tsx`, `app/globals.css`, `components/hero/HeroName.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: `useMotionTier`, `gsap`, `useGSAP`, `readStorage` and `writeStorage`, the hero's `data-*` hooks (Task 8), `StrokeWord`, `StrokeMode`.
- Produces:
  - `ENTRANCE_KEY = "kakejiku:entered"`, `ENTRANCE_PREPAINT: string`
  - `<EntranceProvider>`, which wraps the hero and renders `div[data-entrance-phase]`
  - `useEntrance(): { phase: "unroll" | "write" | "menu" | "done"; nameWritten(): void }`

The sequence (spec): the scroll unrolls from the top roller, the ink mountains soak in, ミエル is written, then the menu staggers in. It runs once per session, only at full motion, only on `/` without a hash. Any key, wheel, click or touch finishes it at once.

- [ ] **Step 1: Write the failing e2e test**

`e2e/entrance.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const phase = (page: Page) => page.locator("[data-entrance-phase]");
const heroClip = (page: Page) => page.locator("[data-hero]").evaluate((el) => getComputedStyle(el).clipPath);

test("plays once, then settles", async ({ page }) => {
  await page.goto("/");
  await expect(phase(page)).not.toHaveAttribute("data-entrance-phase", "done", { timeout: 500 });
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 15_000 });
  await expect(page.locator("[data-hero-menu] li").first()).toBeVisible();
});

test("a second visit in the same session skips it", async ({ page }) => {
  await page.goto("/");
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 15_000 });
  await page.reload();
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
});

test("pressing Tab finishes it and the skip link is usable", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300);
  await page.keyboard.press("Tab");
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_000 });
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  expect(await heroClip(page)).not.toContain("100%");
});

test("scrolling finishes it", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 400);
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_000 });
});

test("deep links skip it", async ({ page }) => {
  await page.goto("/#music");
  await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("never plays", async ({ page }) => {
    await page.goto("/");
    await expect(phase(page)).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the hero is never left clipped", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(4_500);
    expect(await heroClip(page)).not.toContain("100%");
  });
});

test("if the script never takes over, the failsafe unclips the hero within 4 seconds", async ({ page }) => {
  // Simulate "pre-paint ran, app JS crashed": block the Next.js bundles but keep the inline script.
  await page.route(/\/_next\/static\/chunks\//, (route) => route.abort());
  await page.goto("/");
  await page.waitForTimeout(4_500);
  expect(await heroClip(page)).not.toContain("100%");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx playwright test e2e/entrance.spec.ts`. Expected: FAIL (no `[data-entrance-phase]`).

- [ ] **Step 3: Pre-paint script and failsafe**

Append to `lib/motion/tier.ts`:

```ts
export const ENTRANCE_KEY = "kakejiku:entered";

/** Runs in <head> before paint so the hero starts rolled up instead of flashing. */
export const ENTRANCE_PREPAINT = `try{var d=document.documentElement;if(location.pathname==="/"&&!location.hash&&!matchMedia(${JSON.stringify(REDUCE_QUERY)}).matches&&!matchMedia(${JSON.stringify(NARROW_QUERY)}).matches&&sessionStorage.getItem(${JSON.stringify(ENTRANCE_KEY)})!=="1")d.dataset.entrance="pending"}catch(e){}`;
```

In `app/layout.tsx`, add `suppressHydrationWarning` to `<html>` (the script adds an attribute before React hydrates) and put the script first in `<head>`:

```tsx
<html lang="en" className={fonts} style={rootVars} suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: ENTRANCE_PREPAINT }} />
    {/* the <noscript> from Task 6 stays here */}
  </head>
```

Check the Task 0 notes for the Next 16 way to inline a blocking head script in the App Router. If the docs recommend `next/script` with `strategy="beforeInteractive"`, use that instead.

Append to `app/globals.css`:

```css
/* Entrance: hero starts rolled up. The failsafe unrolls it if JS never takes over. */
html[data-entrance="pending"] [data-hero] {
  clip-path: inset(0 0 100% 0);
  animation: entrance-failsafe 0s linear 4s forwards;
}
@keyframes entrance-failsafe { to { clip-path: inset(0 0 0 0); } }
html:not([data-tier="none"]) [data-entrance-phase="write"] [data-hero-menu] li { visibility: hidden; }
```

- [ ] **Step 4: Implement the provider**

`components/hero/Entrance.tsx`:

```tsx
"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { readStorage, writeStorage } from "@/lib/motion/storage";
import { ENTRANCE_KEY } from "@/lib/motion/tier";

export type EntrancePhase = "unroll" | "write" | "menu" | "done";
type Ctx = { phase: EntrancePhase; nameWritten: () => void };

const EntranceContext = createContext<Ctx>({ phase: "done", nameWritten: () => {} });
export const useEntrance = () => useContext(EntranceContext);

const PARTS = "[data-hero], [data-unroll-roller], [data-hero-mountains], [data-hero-menu] li";

export function EntranceProvider({ children }: { children: ReactNode }) {
  const tier = useMotionTier();
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<EntrancePhase>("unroll");
  const phaseRef = useRef(phase);
  const pendingAtLoad = useRef<boolean | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const finish = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    const parts = ref.current?.querySelectorAll(PARTS);
    if (parts?.length) {
      gsap.killTweensOf(parts);
      gsap.set(parts, { clearProps: "all" }); // back to the CSS final state
    }
    document.documentElement.removeAttribute("data-entrance");
    writeStorage("session", ENTRANCE_KEY, "1");
    phaseRef.current = "done";
    setPhase("done");
  }, []);

  useGSAP(
    () => {
      // Remember the pre-paint decision once; StrictMode runs effects twice in development.
      pendingAtLoad.current ??= document.documentElement.dataset.entrance === "pending" && readStorage("session", ENTRANCE_KEY) !== "1";
      if (phaseRef.current === "done") return;
      if (tier !== "full" || !pendingAtLoad.current) {
        finish();
        return;
      }
      const hero = ref.current?.querySelector<HTMLElement>("[data-hero]");
      const roller = hero?.querySelector<HTMLElement>("[data-unroll-roller]");
      const mountains = hero?.querySelector<HTMLElement>("[data-hero-mountains]");
      if (!hero || !roller || !mountains) {
        finish();
        return;
      }
      document.documentElement.removeAttribute("data-entrance"); // GSAP owns the clip from here
      timeline.current = gsap
        .timeline()
        .fromTo(hero, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.2, ease: "power2.inOut" })
        .fromTo(roller, { y: 0, autoAlpha: 1 }, { y: () => hero.offsetHeight, duration: 1.2, ease: "power2.inOut" }, 0)
        .to(roller, { autoAlpha: 0, duration: 0.25 })
        .fromTo(mountains, { "--r": "0%" }, { "--r": "150%", duration: 0.9, ease: "power1.out" }, "-=0.35")
        .call(() => setPhase("write"));
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      if (phase !== "menu") return;
      gsap.from("[data-hero-menu] li", { autoAlpha: 0, y: 16, stagger: 0.08, duration: 0.5, ease: "power2.out", onComplete: finish });
    },
    { scope: ref, dependencies: [phase] },
  );

  // Any intent to move on finishes the entrance immediately.
  useEffect(() => {
    if (phase === "done") return;
    const events = ["keydown", "wheel", "pointerdown", "touchstart"] as const;
    const stop = () => finish();
    events.forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, stop));
  }, [phase, finish]);

  const nameWritten = useCallback(() => setPhase((p) => (p === "write" ? "menu" : p)), []);
  const value = useMemo(() => ({ phase, nameWritten }), [phase, nameWritten]);

  return (
    <div ref={ref} data-entrance-phase={phase}>
      <EntranceContext.Provider value={value}>{children}</EntranceContext.Provider>
    </div>
  );
}
```

If no visitor menu exists (an empty site), the menu phase has nothing to animate and `onComplete` still fires `finish`, because GSAP completes empty tweens. Verify that with the empty seed in Step 6.

`components/hero/HeroName.tsx` becomes:

```tsx
"use client";
import type { StrokeMode } from "@/components/kanji/StrokeKanji";
import { StrokeWord } from "@/components/kanji/StrokeWord";
import { useEntrance, type EntrancePhase } from "./Entrance";
import styles from "./Hero.module.css";

const MODE: Record<EntrancePhase, StrokeMode> = { unroll: "idle", write: "write", menu: "done", done: "done" };

export function HeroName() {
  const { phase, nameWritten } = useEntrance();
  return <StrokeWord text="ミエル" mode={MODE[phase]} onDone={nameWritten} className={styles.kana} charClassName={styles.kanaChar} />;
}
```

In `app/page.tsx`, wrap `<Hero chapters={chapters} />` in `<EntranceProvider>` (import from `@/components/hero/Entrance`).

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test`. Expected: PASS. The earlier e2e specs still pass because `navigation` and `rail` use hashes (no entrance) and `structure` runs under reduced motion.

- [ ] **Step 6: Look at it**

In a fresh private window, `npm run dev:fixtures`: the roller travels down, the paper is revealed behind it, the mountains soak in, ミエル is written character by character, and the menu rises in. Reload: it's settled at once. Then `npm run dev` with the empty seed in a fresh private window: the entrance completes even though there's no menu.

- [ ] **Step 7: Commit**

```bash
git add components/hero lib/motion/tier.ts app/layout.tsx app/globals.css app/page.tsx e2e/entrance.spec.ts
git commit -m "feat: unroll the scroll and write ミエル on the first visit" -m "The entrance is the first impression the spec asks for, but it must never stand between a visitor and the content: any key, wheel or click finishes it, deep links and repeat visits skip it, reduced motion never sees it, and a CSS failsafe unclips the hero if the app script dies." -m "Verified: e2e for play-once, session skip, Tab and wheel interrupt, deep-link skip, reduced motion, no-JS and the crash failsafe."
```

---

### Task 12: Season tints and weather gusts

**Files:**
- Create: `lib/weather.ts`, `lib/weather.test.ts`, `components/motion/SeasonController.tsx`, `components/motion/SeasonController.test.tsx`, `components/motion/WeatherGust.tsx`, `components/motion/WeatherGust.module.css`, `e2e/seasons.spec.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `useActiveChapter` (Task 10), `SEASONS`, `SeasonId`, `WeatherKind`, `Chapter`, `useMotionTier`, `gsap`, `mulberry32`.
- Produces:
  - `type Particle = { x; y; vx; vy; rot; vr; size; life: number }`
  - `GUST_MS`, `GUST_COUNT`
  - `spawnGust(kind: WeatherKind, count: number, w: number, h: number, rand?: () => number): Particle[]`
  - `stepParticles(ps: Particle[], dt: number): Particle[]`
  - `gustAlpha(elapsed: number): number`, `gustDone(elapsed: number): boolean`
  - `<SeasonController chapters />`, `<WeatherGust kind />`

Spec: as a chapter becomes active, the wall tint tweens to its season. Weather blows through as **one short gust at the season change**, then stops. No weather runs continuously. Paper colour is per-section and static (Task 8), so text contrast never depends on a tween.

- [ ] **Step 1: Write the failing tests**

`lib/weather.test.ts`:

```ts
import { expect, test } from "vitest";
import { mulberry32 } from "./random";
import { GUST_MS, gustAlpha, gustDone, spawnGust, stepParticles } from "./weather";

test("spawns the requested number of particles, off-screen left", () => {
  const ps = spawnGust("petal", 30, 1440, 900, mulberry32(1));
  expect(ps).toHaveLength(30);
  for (const p of ps) expect(p.x).toBeLessThan(0);
});

test("lanterns rise, snow falls", () => {
  expect(spawnGust("lantern", 20, 1440, 900, mulberry32(2)).every((p) => p.vy < 0)).toBe(true);
  expect(spawnGust("snow", 20, 1440, 900, mulberry32(3)).every((p) => p.vy > 0)).toBe(true);
});

test("stepping moves particles right and ages them", () => {
  const [p] = spawnGust("maple", 1, 1440, 900, mulberry32(4));
  const [q] = stepParticles([p], 16);
  expect(q.x).toBeGreaterThan(p.x);
  expect(q.life).toBe(16);
});

test("the gust fades in, holds, fades out and ends", () => {
  expect(gustAlpha(0)).toBe(0);
  expect(gustAlpha(GUST_MS / 2)).toBe(1);
  expect(gustAlpha(GUST_MS)).toBe(0);
  expect(gustDone(GUST_MS - 1)).toBe(false);
  expect(gustDone(GUST_MS)).toBe(true);
});
```

`components/motion/SeasonController.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CHAPTERS } from "@/lib/chapters";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { SEASONS } from "@/lib/seasons";
import { SeasonController } from "./SeasonController";

vi.mock("./ActiveChapter", () => ({ useActiveChapter: () => "events" }));

test("reduced motion sets the wall tint at once and blows no weather", () => {
  const { container } = render(
    <MotionTierContext.Provider value="none">
      <SeasonController chapters={[...CHAPTERS]} />
    </MotionTierContext.Provider>,
  );
  expect(document.documentElement.style.getPropertyValue("--wall")).toBe(SEASONS["summer-night"].wall);
  expect(container.querySelector("canvas")).toBeNull();
});
```

`e2e/seasons.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const wall = (page: Page) => page.evaluate(() => document.documentElement.style.getPropertyValue("--wall").trim());

test("the wall turns to the Events night, then to winter", async ({ page }) => {
  await page.goto("/#events");
  await expect.poll(() => wall(page)).toBe("#0f1426");
  await page.keyboard.press("5"); // Shelf
  await expect.poll(() => wall(page)).toBe("#262d33");
});

test("a gust appears on a season change and has stopped drawing shortly after", async ({ page }) => {
  await page.goto("/#about");
  await page.keyboard.press("2"); // to Events
  const canvas = page.locator("canvas[aria-hidden='true']");
  await expect(canvas).toHaveCount(1);
  await page.waitForTimeout(3_500);
  const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
    return false;
  });
  expect(painted).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no weather at all", async ({ page }) => {
    await page.goto("/#about");
    await page.keyboard.press("2");
    await page.waitForTimeout(500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/weather.test.ts components/motion/SeasonController.test.tsx && npx playwright test e2e/seasons.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement the simulation**

`lib/weather.ts`:

```ts
import type { WeatherKind } from "./seasons";

export type Particle = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; life: number };

export const GUST_MS = 2600;
export const GUST_COUNT = 36;
const FADE_IN = 300;
const FADE_OUT = 700;

/** Vertical drift range in px/ms per kind: lanterns float up, snow drifts down slowly. */
const DRIFT: Record<WeatherKind, [number, number]> = {
  petal: [0.02, 0.09], lantern: [-0.06, -0.02], maple: [0.04, 0.12],
  ginkgo: [0.04, 0.11], snow: [0.03, 0.07], plum: [0.02, 0.08],
};

export function spawnGust(kind: WeatherKind, count: number, w: number, h: number, rand: () => number = Math.random): Particle[] {
  const [lo, hi] = DRIFT[kind];
  return Array.from({ length: count }, () => ({
    x: -40 - rand() * w * 0.5,
    y: (kind === "lantern" ? 0.35 : 0) * h + rand() * h * 0.65,
    vx: 0.45 + rand() * 0.4,
    vy: lo + rand() * (hi - lo),
    rot: rand() * Math.PI * 2,
    vr: (rand() - 0.5) * 0.006,
    size: 6 + rand() * 8,
    life: 0,
  }));
}

export function stepParticles(ps: Particle[], dt: number): Particle[] {
  return ps.map((p) => ({
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt + Math.sin((p.life + dt) / 240) * 0.3,
    rot: p.rot + p.vr * dt,
    life: p.life + dt,
  }));
}

export function gustAlpha(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= GUST_MS) return 0;
  if (elapsed < FADE_IN) return elapsed / FADE_IN;
  if (elapsed > GUST_MS - FADE_OUT) return (GUST_MS - elapsed) / FADE_OUT;
  return 1;
}

export function gustDone(elapsed: number): boolean {
  return elapsed >= GUST_MS;
}
```

- [ ] **Step 4: Implement the components**

`components/motion/WeatherGust.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import type { WeatherKind } from "@/lib/seasons";
import { GUST_COUNT, gustAlpha, gustDone, spawnGust, stepParticles, type Particle } from "@/lib/weather";
import styles from "./WeatherGust.module.css";

const COLOUR: Record<WeatherKind, string> = {
  petal: "#f2b8c6", lantern: "#f2a640", maple: "#b8442c", ginkgo: "#e2b23a", snow: "#ffffff", plum: "#d9677f",
};

function draw(ctx: CanvasRenderingContext2D, kind: WeatherKind, p: Particle, alpha: number) {
  const s = p.size;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = COLOUR[kind];
  ctx.beginPath();
  switch (kind) {
    case "petal":
      ctx.ellipse(0, 0, s * 0.55, s * 0.3, 0, 0, Math.PI * 2);
      break;
    case "lantern":
      ctx.shadowColor = COLOUR.lantern;
      ctx.shadowBlur = s * 1.5;
      ctx.roundRect(-s * 0.4, -s * 0.55, s * 0.8, s * 1.1, s * 0.3);
      break;
    case "maple":
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.25 : s * 0.6;
        const a = (i / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      break;
    case "ginkgo":
      ctx.moveTo(0, s * 0.4);
      ctx.arc(0, s * 0.4, s * 0.7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.closePath();
      break;
    case "snow":
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      break;
    case "plum":
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const [cx, cy] = [Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3];
        ctx.moveTo(cx + s * 0.18, cy);
        ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
      }
      break;
  }
  ctx.fill();
  ctx.restore();
}

export function WeatherGust({ kind }: { kind: WeatherKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tier = useMotionTier();

  useEffect(() => {
    if (tier !== "full") return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let particles = spawnGust(kind, GUST_COUNT, w, h);
    const start = performance.now();
    let last = start;
    let raf = 0;
    const frame = (now: number) => {
      particles = stepParticles(particles, Math.min(now - last, 50));
      last = now;
      ctx.clearRect(0, 0, w, h);
      const elapsed = now - start;
      if (gustDone(elapsed)) return; // canvas left clear; the loop ends here
      const alpha = gustAlpha(elapsed);
      for (const p of particles) draw(ctx, kind, p, alpha);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [kind, tier]);

  if (tier !== "full") return null;
  return <canvas ref={ref} className={styles.gust} aria-hidden="true" />;
}
```

`components/motion/WeatherGust.module.css`:

```css
.gust { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 40; pointer-events: none; }
```

`components/motion/SeasonController.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { Chapter } from "@/lib/chapters";
import { gsap } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { SEASONS, type SeasonId, type WeatherKind } from "@/lib/seasons";
import { useActiveChapter } from "./ActiveChapter";
import { WeatherGust } from "./WeatherGust";

export function SeasonController({ chapters }: { chapters: Chapter[] }) {
  const active = useActiveChapter();
  const tier = useMotionTier();
  const season: SeasonId = chapters.find((c) => c.id === active)?.season ?? "top";
  const previous = useRef<SeasonId>(season);
  const [gust, setGust] = useState<{ kind: WeatherKind; n: number } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const wall = SEASONS[season].wall;
    if (tier === "none") gsap.set(root, { "--wall": wall, overwrite: true });
    else gsap.to(root, { "--wall": wall, duration: 1.2, ease: "power1.inOut", overwrite: true });

    const kind = SEASONS[season].weather;
    if (season !== previous.current && kind && tier === "full") setGust((g) => ({ kind, n: (g?.n ?? 0) + 1 }));
    previous.current = season;
  }, [season, tier]);

  // Leaving the page (e.g. to an event) restores the neutral wall.
  useEffect(
    () => () => {
      gsap.killTweensOf(document.documentElement);
      gsap.set(document.documentElement, { "--wall": SEASONS.top.wall });
    },
    [],
  );

  return gust ? <WeatherGust key={gust.n} kind={gust.kind} /> : null;
}
```

Add `<SeasonController chapters={chapters} />` inside `ActiveChapterProvider` in `app/page.tsx`, after `<ScrollFrame>…</ScrollFrame>`.

- [ ] **Step 5: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test`. Expected: PASS.

- [ ] **Step 6: Performance check (spec: "to verify in planning")**

Run `npm run dev:fixtures`. In Chrome DevTools > Performance, with 4× CPU throttling, record pressing `2` (About → Events). Gust frames should average under 16.7ms, with no long task over 50ms. If they don't, lower `GUST_COUNT` to 24 and say so in the PR body. Repeat against `npm run build && npm start` in Task 22, once a production build with real content exists.

- [ ] **Step 7: Commit**

```bash
git add lib/weather.ts lib/weather.test.ts components/motion/SeasonController.tsx components/motion/SeasonController.test.tsx components/motion/WeatherGust.tsx components/motion/WeatherGust.module.css app/page.tsx e2e/seasons.spec.ts
git commit -m "feat: tint the wall per season and blow one gust at each change" -m "The spec wants seasons felt, not running constantly: the wall eases to the chapter's season and a short gust of that season's weather crosses once, then the canvas stops drawing. Reduced motion gets the tint instantly and no canvas." -m "Verified: unit tests for the particle sim; e2e for wall colour, gust lifetime and reduced motion; DevTools trace at 4x CPU throttle."
```

---

### Task 13: 私 About: the letter, the candid and the toolbox

**Files:**
- Create: `components/chapters/About.tsx`, `components/chapters/About.module.css`, `components/chapters/About.test.tsx`
- Modify: `components/chapters/ChapterBody.tsx`

**Interfaces:**
- Consumes: `About` type (Task 2), `Photo`, `SealStamp`, `gsap`, `useGSAP`, `useMotionTier`.
- Produces: `<About about />`.

Signature move (spec): **the letter writes in, the stamps press.** The letter is Klee One on ruled paper, with one taped-in candid photo and the toolbox as seal stamps. The stamps press through `SealStamp`'s own animation; the letter's lines reveal left to right, one paragraph after another.

- [ ] **Step 1: Write the failing test**

`components/chapters/About.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { FIXTURES } from "@/lib/content/fixtures";
import { About } from "./About";

const renderAbout = (about = FIXTURES.about) =>
  render(<MotionTierContext.Provider value="none"><About about={about} /></MotionTierContext.Provider>);

test("renders every letter paragraph, signed", () => {
  renderAbout();
  for (const p of FIXTURES.about.letter) expect(screen.getByText(p)).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "A letter from Miel" })).toBeInTheDocument();
});

test("the candid photo carries its alt text", () => {
  renderAbout();
  expect(screen.getByAltText(FIXTURES.about.candid!.alt)).toBeInTheDocument();
});

test("the toolbox is a labelled list of readable stamps", () => {
  renderAbout();
  const list = screen.getByRole("list", { name: "Toolbox" });
  expect(list.querySelectorAll("li")).toHaveLength(FIXTURES.about.toolbox.length);
  expect(screen.getByText("TypeScript")).not.toHaveAttribute("aria-hidden");
});

test("no candid and no toolbox render nothing for them", () => {
  renderAbout({ letter: ["Only a letter."], toolbox: [] });
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("list", { name: "Toolbox" })).toBeNull();
});

test("reduced motion leaves the lines unclipped", () => {
  const { container } = renderAbout();
  for (const line of container.querySelectorAll<HTMLElement>("[data-letter-line]")) expect(line.style.clipPath).toBe("");
});
```

`next/image` renders a plain `<img>` in jsdom. If it complains about the `data:` src or missing config, mock it in the test: `vi.mock("next/image", () => ({ default: (p: any) => <img {...p} /> }))`. Strip `unoptimized` before spreading.

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/chapters/About.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement**

`components/chapters/About.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { SealStamp } from "@/components/motion/SealStamp";
import { Photo } from "@/components/Photo";
import type { About as AboutData } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./About.module.css";

export function About({ about }: { about: AboutData }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none") return;
      gsap.fromTo(
        "[data-letter-line]",
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)", duration: 1, stagger: 0.4, ease: "power1.inOut",
          scrollTrigger: { trigger: "[data-letter]", start: "top 75%", once: true },
        },
      );
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.about}>
      <article className={styles.letter} aria-label="A letter from Miel" data-letter>
        {about.letter.map((p, i) => (
          <p key={i} className={styles.line} data-letter-line>{p}</p>
        ))}
        <p className={styles.sign}>Miel</p>
      </article>

      {about.candid && (
        <figure className={styles.candid}>
          <span className={styles.tape} aria-hidden="true" />
          <Photo photo={about.candid} sizes="(min-width: 768px) 320px, 80vw" className={styles.photo} />
        </figure>
      )}

      {about.toolbox.length > 0 && (
        <div className={styles.toolbox}>
          <h3 id="toolbox-title" className={styles.toolboxTitle}>Toolbox</h3>
          <ul aria-labelledby="toolbox-title" className={styles.stamps}>
            {about.toolbox.map((tool) => (
              <li key={tool}><SealStamp size="sm">{tool}</SealStamp></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

`components/chapters/About.module.css`:

```css
.about {
  display: grid; gap: clamp(2rem, 5vw, 4rem);
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  grid-template-areas: "letter candid" "letter toolbox";
  align-items: start;
}
.letter {
  grid-area: letter;
  font-family: var(--font-hand), serif; font-size: clamp(1.05rem, 1.6vw, 1.25rem); line-height: 2.2rem;
  padding: 1.1rem clamp(1rem, 3vw, 2.25rem) 1.5rem;
  background: repeating-linear-gradient(to bottom, transparent 0 calc(2.2rem - 1px), color-mix(in srgb, var(--ink) 18%, transparent) calc(2.2rem - 1px) 2.2rem);
  background-position: 0 1.1rem;
}
.line { margin: 0 0 2.2rem; }
.sign { margin: 0; text-align: right; font-weight: 600; }
.candid { grid-area: candid; position: relative; margin: 0; padding: 0.6rem 0.6rem 2rem; background: #fbf8f1; box-shadow: 0 8px 20px rgb(0 0 0 / 0.18); rotate: 2.5deg; justify-self: center; max-width: 20rem; }
.photo { width: 100%; height: auto; }
.tape { position: absolute; top: -0.7rem; left: 50%; translate: -50% 0; rotate: -4deg; width: 6rem; height: 1.6rem; background: rgb(236 222 190 / 0.85); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12); }
.toolbox { grid-area: toolbox; }
.toolboxTitle { margin: 0 0 0.9rem; font-size: 1.1rem; color: var(--muted); }
.stamps { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.6rem; }
@media (max-width: 767px) {
  .about { grid-template-columns: 1fr; grid-template-areas: "letter" "candid" "toolbox"; }
}
```

In `components/chapters/ChapterBody.tsx`, delete the `void content;` line and replace the about case:

```tsx
case "about":
  return <About about={content.about} />;
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test e2e/structure.spec.ts`. Expected: PASS (including axe).

- [ ] **Step 5: Commit**

```bash
git add components/chapters/About.tsx components/chapters/About.module.css components/chapters/About.test.tsx components/chapters/ChapterBody.tsx
git commit -m "feat: add the About letter with a taped candid and toolbox stamps" -m "About is the spring chapter: a handwritten letter on ruled paper that writes in line by line, the one candid photo the spec allows, and the toolbox kept small as seal stamps rather than a skills headline." -m "Verified: unit tests for letter, photo alt, toolbox list and reduced motion; axe on fixtures."
```

---

### Task 14: 祭 Events: the bento of mounted prints

**Files:**
- Create: `lib/tilt.ts`, `lib/tilt.test.ts`, `components/chapters/EventPhoto.tsx`, `components/chapters/Events.tsx`, `components/chapters/Events.module.css`, `components/chapters/Events.test.tsx`
- Modify: `components/chapters/ChapterBody.tsx`

**Interfaces:**
- Consumes: `EventItem`, `formatDate`, `InkBleed`, `Photo`, `gsap`, `useGSAP`, `useMotionTier`.
- Produces:
  - `tiltFor(clientX: number, clientY: number, rect: { left; top; width; height: number }, max?: number): { rotationX: number; rotationY: number }`
  - `<EventPhoto event sizes className? />`, the cover photo shared by the tile and the event page (Task 15 adds the morph here, once)
  - `<Events events />`
  - `BENTO_SHAPES`

Signature move (spec): **per-tile ink bleed from a random origin, inner parallax, pointer tilt.** The tilt and parallax run only at tier `full`; the bleed runs at `full` and `lite`.

- [ ] **Step 1: Write the failing tests**

`lib/tilt.test.ts`:

```ts
import { expect, test } from "vitest";
import { tiltFor } from "./tilt";

const rect = { left: 100, top: 100, width: 200, height: 100 };

test("centre is flat", () => {
  expect(tiltFor(200, 150, rect)).toEqual({ rotationX: 0, rotationY: 0 });
});

test("top-left corner tilts toward the pointer, capped at half the max each way", () => {
  expect(tiltFor(100, 100, rect, 8)).toEqual({ rotationX: 4, rotationY: -4 });
});

test("pointer outside the tile is clamped", () => {
  expect(tiltFor(-500, 900, rect, 8)).toEqual({ rotationX: -4, rotationY: -4 });
});
```

`components/chapters/Events.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Events } from "./Events";

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

const renderEvents = () => render(<MotionTierContext.Provider value="none"><Events events={FIXTURES.events} /></MotionTierContext.Provider>);

test("one link per event, to its own page, named by its heading", () => {
  renderEvents();
  const links = screen.getAllByRole("link");
  expect(links.map((l) => l.getAttribute("href"))).toEqual(FIXTURES.events.map((e) => `/events/${e.slug}`));
  expect(within(links[0]).getByRole("heading", { level: 3 })).toHaveTextContent("Fixture event 1");
});

test("dates are machine-readable and human-formatted", () => {
  renderEvents();
  const time = screen.getAllByText((_, el) => el?.tagName === "TIME")[0];
  expect(time).toHaveAttribute("dateTime", FIXTURES.events[0].date);
});

test("tile shapes cycle through the six-slot pattern", () => {
  const { container } = renderEvents();
  const shapes = [...container.querySelectorAll("[data-shape]")].map((el) => el.getAttribute("data-shape"));
  expect(shapes).toEqual(["a", "b", "c", "d", "e", "f", "a"]);
});

test("an event without a place shows only its date", () => {
  renderEvents();
  const noPlace = FIXTURES.events.find((e) => !e.place)!;
  const link = screen.getAllByRole("link").find((l) => l.getAttribute("href") === `/events/${noPlace.slug}`)!;
  expect(link.textContent).not.toContain("·");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/tilt.test.ts components/chapters/Events.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/tilt.ts`:

```ts
type Rect = { left: number; top: number; width: number; height: number };

/** Degrees to rotate a tile so it leans toward the pointer. */
export function tiltFor(clientX: number, clientY: number, rect: Rect, max = 8): { rotationX: number; rotationY: number } {
  const clamp = (v: number) => Math.min(0.5, Math.max(-0.5, v));
  const nx = clamp((clientX - rect.left) / rect.width - 0.5);
  const ny = clamp((clientY - rect.top) / rect.height - 0.5);
  const round = (v: number) => Math.round(v * 100) / 100 || 0; // avoid -0
  return { rotationX: round(-ny * max), rotationY: round(nx * max) };
}
```

`components/chapters/EventPhoto.tsx`:

```tsx
import { Photo } from "@/components/Photo";
import type { EventItem } from "@/lib/content/schema";

/** The event's cover photo. Shared by the bento tile and the event page so Task 15 can morph one into the other. */
export function EventPhoto({ event, sizes, className }: { event: EventItem; sizes: string; className?: string }) {
  return <Photo photo={event.photos[0]} sizes={sizes} className={className} />;
}
```

`components/chapters/Events.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { InkBleed } from "@/components/motion/InkBleed";
import type { EventItem } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { tiltFor } from "@/lib/tilt";
import { EventPhoto } from "./EventPhoto";
import styles from "./Events.module.css";

export const BENTO_SHAPES = ["a", "b", "c", "d", "e", "f"] as const;

export function Events({ events }: { events: EventItem[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const tier = useMotionTier();

  // Inner parallax: the photo drifts inside its mount as the tile crosses the viewport.
  useGSAP(
    () => {
      if (tier !== "full") return;
      for (const el of gsap.utils.toArray<HTMLElement>("[data-parallax]")) {
        gsap.fromTo(el, { yPercent: -6 }, {
          yPercent: 6, ease: "none",
          scrollTrigger: { trigger: el.closest("li"), start: "top bottom", end: "bottom top", scrub: true },
        });
      }
    },
    { scope: ref, dependencies: [tier, events.length], revertOnUpdate: true },
  );

  // Pointer tilt, mouse only, full motion only.
  useEffect(() => {
    if (tier !== "full" || !ref.current) return;
    const cleanups = [...ref.current.querySelectorAll<HTMLElement>("[data-tilt]")].map((el) => {
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.4, ease: "power2.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.4, ease: "power2.out" });
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const t = tiltFor(e.clientX, e.clientY, el.getBoundingClientRect());
        rx(t.rotationX);
        ry(t.rotationY);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "transform" });
      };
    });
    return () => cleanups.forEach((c) => c());
  }, [tier, events.length]);

  return (
    <ul ref={ref} className={styles.bento}>
      {events.map((event, i) => (
        <li key={event.slug} className={styles.tile} data-shape={BENTO_SHAPES[i % BENTO_SHAPES.length]}>
          <Link href={`/events/${event.slug}`} className={styles.print} data-tilt>
            <InkBleed origin="random" className={styles.media}>
              <div className={styles.parallax} data-parallax>
                <EventPhoto event={event} sizes="(min-width: 1180px) 700px, (min-width: 768px) 60vw, 100vw" className={styles.img} />
              </div>
            </InkBleed>
            <div className={styles.caption}>
              <h3 className={styles.name}>{event.name}</h3>
              <p className={styles.meta}>
                <time dateTime={event.date}>{formatDate(event.date)}</time>
                {event.place && <> · {event.place}</>}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

`components/chapters/Events.module.css`:

```css
.bento {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: clamp(7rem, 11vw, 10rem); grid-auto-flow: dense;
  gap: clamp(0.6rem, 1.5vw, 1.25rem);
  perspective: 1200px;
}
.tile[data-shape="a"] { grid-column: span 4; grid-row: span 3; }
.tile[data-shape="b"] { grid-column: span 2; grid-row: span 2; }
.tile[data-shape="c"] { grid-column: span 2; grid-row: span 1; }
.tile[data-shape="d"], .tile[data-shape="e"], .tile[data-shape="f"] { grid-column: span 2; grid-row: span 2; }

/* A mounted print: paper mat, dark backing, a little lift. */
.print {
  position: relative; display: block; height: 100%;
  border-radius: 6px; overflow: hidden; text-decoration: none; color: #f1e8d6;
  background: #0b1020;
  box-shadow: inset 0 0 0 8px #e9dfc8, 0 12px 30px rgb(0 0 0 / 0.4);
  transform-style: preserve-3d; will-change: transform;
}
.print:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }
.media { position: absolute; inset: 8px; overflow: hidden; }
.parallax { position: absolute; inset: -8% 0; }
.img { width: 100%; height: 100%; object-fit: cover; }
.caption {
  position: absolute; left: 8px; right: 8px; bottom: 8px;
  padding: 2rem 1rem 0.85rem;
  background: linear-gradient(transparent, rgb(8 10 22 / 0.92) 55%);
}
.name { margin: 0; font-size: clamp(1rem, 1.6vw, 1.35rem); overflow-wrap: anywhere; }
.meta { margin: 0.2rem 0 0; font-size: 0.85rem; color: #d9cfb8; }
@media (max-width: 767px) {
  .bento { grid-template-columns: 1fr 1fr; }
  .tile[data-shape] { grid-column: span 2; grid-row: span 2; }
}
```

In `ChapterBody.tsx`:

```tsx
case "events":
  return <Events events={content.events} />;
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test`. Expected: PASS.

- [ ] **Step 5: Look at it**

`npm run dev:fixtures`, then scroll to Events. Each print bleeds in from a different point, the photos drift inside their mats, and the tiles lean toward the mouse and settle when it leaves. The long fixture name wraps, and the unbroken one breaks rather than overflowing. Run `/break-ui` on the bento if anything looks off.

- [ ] **Step 6: Commit**

```bash
git add lib/tilt.ts lib/tilt.test.ts components/chapters/EventPhoto.tsx components/chapters/Events.tsx components/chapters/Events.module.css components/chapters/Events.test.tsx components/chapters/ChapterBody.tsx
git commit -m "feat: show events attended as a bento of mounted prints" -m "The owner found plain cards generic, so events are mounted prints in a bento, on the dark festival-night paper. Each tile bleeds in from its own origin, the photo drifts inside the mat, and tiles lean toward the mouse; tilt and parallax are desktop full-motion only." -m "Verified: unit tests for links, dates, shape cycle and tilt maths; checked long and unbroken names in the browser."
```

---

### Task 15: Event pages and the tile-to-header morph

**Files:**
- Create: `app/events/[slug]/page.tsx`, `app/events/[slug]/page.module.css`, `e2e/events.spec.ts`
- Modify: `components/chapters/EventPhoto.tsx`, `next.config.ts`, `app/globals.css`, `docs/reference/next16-notes.md`

**Interfaces:**
- Consumes: `getContent`, `EventItem`, `formatDate`, `seasonVars`, `ScrollFrame`, `Footer`, `EventPhoto`, `Photo`, `InkBleed`.
- Produces: the static routes `/events/<slug>` (one per event, `dynamicParams = false`).

Spec: each bento tile opens its own page, with the tile morphing into the page header (View Transition). **Verify first.** If the morph isn't cleanly supported, fall back to an ink-bleed reveal of the header, reusing the same cover photo.

- [ ] **Step 1: Decide the morph approach from the docs**

Read the view-transition notes from Task 0 and the guide itself (`grep -ril viewtransition node_modules/next/dist/docs/`). Record the decision in `docs/reference/next16-notes.md` under "Event morph":

- **Supported** (expected: React's `<ViewTransition>` with `experimental.viewTransition: true` in `next.config.ts`): use Path A.
- **Not supported, or experimental with known breakage**: use Path B.

- [ ] **Step 2: Write the failing e2e test**

`e2e/events.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("a tile opens its event page, and Back returns to the Events chapter", async ({ page }) => {
  await page.goto("/#events");
  await page.locator("#events").getByRole("link").first().click();
  await expect(page).toHaveURL(/\/events\/fixture-event-1$/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Fixture event 1");

  await page.getByRole("link", { name: "Back to Events" }).click();
  await expect(page).toHaveURL(/\/#events$/);
  await expect(page.locator("#events-title")).toBeFocused();
  await expect.poll(() => page.locator("#events-title").evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(200);
});

test("tiles work from the keyboard", async ({ page }) => {
  await page.goto("/#events");
  await page.locator("#events").getByRole("link").nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/events\/fixture-event-2$/);
});

test("the event page shows the story and the rest of the photos", async ({ page }) => {
  await page.goto("/events/fixture-event-3");
  await expect(page.getByText("Fixture story paragraph for event 3.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Fixture photo 13" })).toBeVisible();
});

test("unknown events are a 404", async ({ page }) => {
  const res = await page.goto("/events/not-a-real-event");
  expect(res?.status()).toBe(404);
});

test("long unbroken names don't overflow their tile", async ({ page }) => {
  await page.goto("/#events");
  const overflow = await page.locator("#events li").nth(4).evaluate((li) => li.scrollWidth - li.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("event page has no axe violations", async ({ page }) => {
    await page.goto("/events/fixture-event-1");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `npx playwright test e2e/events.spec.ts`. Expected: FAIL (route missing).

- [ ] **Step 4: Implement the page**

`app/events/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventPhoto } from "@/components/chapters/EventPhoto";
import { Footer } from "@/components/frame/Footer";
import { ScrollFrame } from "@/components/frame/ScrollFrame";
import { InkBleed } from "@/components/motion/InkBleed";
import { Photo } from "@/components/Photo";
import { getContent } from "@/lib/content/load";
import { formatDate } from "@/lib/dates";
import { seasonVars } from "@/lib/seasons";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const { events } = await getContent();
  return events.map((e) => ({ slug: e.slug }));
}

async function findEvent(slug: string) {
  const { events } = await getContent();
  return events.find((e) => e.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await findEvent((await params).slug);
  return event ? { title: `${event.name} · Miel`, description: event.summary } : {};
}

export default async function EventPage({ params }: Props) {
  const event = await findEvent((await params).slug);
  if (!event) notFound();
  const rest = event.photos.slice(1);

  return (
    <ScrollFrame>
      <main id="main" tabIndex={-1} className={styles.page} style={seasonVars("summer-night")}>
        <article>
          <header className={styles.header}>
            <InkBleed className={styles.cover}>
              <EventPhoto event={event} sizes="(min-width: 1180px) 1100px, 100vw" className={styles.coverImg} />
            </InkBleed>
            <p className={styles.kicker}>Event attended</p>
            <h1 className={styles.title}>{event.name}</h1>
            <p className={styles.meta}>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              {event.place && <> · {event.place}</>}
            </p>
          </header>
          <div className={styles.story}>
            <p className={styles.summary}>{event.summary}</p>
            {event.story.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {rest.length > 0 && (
            <ul className={styles.gallery}>
              {rest.map((photo, i) => (
                <li key={`${photo.src}-${i}`}>
                  <InkBleed origin="random">
                    <Photo photo={photo} sizes="(min-width: 768px) 50vw, 100vw" className={styles.galleryImg} />
                  </InkBleed>
                </li>
              ))}
            </ul>
          )}
        </article>
        <nav aria-label="Event" className={styles.nav}>
          <Link href="/#events">Back to Events</Link>
          <Link href="/mokuroku">Plain index</Link>
        </nav>
      </main>
      <Footer />
    </ScrollFrame>
  );
}
```

`app/events/[slug]/page.module.css`:

```css
.page { background: var(--paper); color: var(--ink); padding: clamp(1.5rem, 5vw, 4rem) clamp(1rem, 6vw, 6rem) 4rem; }
.header { display: grid; gap: 0.5rem; margin-bottom: 2.5rem; }
.cover { border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 0 8px #e9dfc8; padding: 8px; background: #0b1020; }
.coverImg { width: 100%; height: auto; max-height: 70vh; object-fit: cover; }
.kicker { margin: 1.5rem 0 0; font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.title { margin: 0; font-size: clamp(2rem, 5vw, 3.5rem); overflow-wrap: anywhere; }
.meta { margin: 0; color: var(--muted); }
.story { max-width: 42rem; font-size: 1.075rem; }
.summary { font-size: 1.25rem; }
.gallery { list-style: none; margin: 3rem 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr)); gap: 1rem; }
.galleryImg { width: 100%; height: auto; border-radius: 4px; }
.nav { display: flex; gap: 1.5rem; margin-top: 3rem; }
```

- [ ] **Step 5a: Path A, View Transition morph (if supported)**

`next.config.ts`:

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { viewTransition: true },
};
```

`components/chapters/EventPhoto.tsx`. Use the export name the docs give (`ViewTransition`, or `unstable_ViewTransition as ViewTransition`):

```tsx
import { unstable_ViewTransition as ViewTransition } from "react";
import { Photo } from "@/components/Photo";
import type { EventItem } from "@/lib/content/schema";

/** The event's cover photo. Same name on the tile and the page, so the browser morphs one into the other. */
export function EventPhoto({ event, sizes, className }: { event: EventItem; sizes: string; className?: string }) {
  return (
    <ViewTransition name={`event-photo-${event.slug}`}>
      <Photo photo={event.photos[0]} sizes={sizes} className={className} />
    </ViewTransition>
  );
}
```

Append to `app/globals.css`, so reduced motion never morphs:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

- [ ] **Step 5b: Path B, fallback (if not supported)**

Leave `EventPhoto` as it is. The page header already ink-bleeds in from the centre using the same cover photo (`InkBleed className={styles.cover}`), which is the spec's fallback. Note it in the PR body.

- [ ] **Step 6: Run the tests and see them pass**

Run: `npm run typecheck && npx vitest run && npx playwright test`. Expected: PASS.

- [ ] **Step 7: Check the build with the empty seed**

Run: `npm run build` (no `CONTENT_SOURCE`). It must succeed with zero events: no event routes, no errors. If Next refuses an empty `generateStaticParams` with `dynamicParams = false`, read the docs and pick the documented pattern. A visitor to `/events/anything` must get a 404, never a crash.

- [ ] **Step 8: Commit**

```bash
git add app/events next.config.ts components/chapters/EventPhoto.tsx app/globals.css e2e/events.spec.ts docs/reference/next16-notes.md
git commit -m "feat: give each attended event its own page with a morph from its tile" -m "The spec gives each event a page so its story and photos have room. The tile's photo morphs into the page header (or, if the docs say View Transitions aren't ready, the header bleeds in from the same photo). Back to Events lands on the chapter heading with focus." -m "Verified: e2e for open, keyboard, back, story, 404 and axe; build succeeds with zero events."
```

---

### Task 16: 音 Music: the ensō record and the setlist

**Files:**
- Create: `components/chapters/Music.tsx`, `components/chapters/Music.module.css`, `components/chapters/Music.test.tsx`
- Modify: `components/chapters/ChapterBody.tsx`

**Interfaces:**
- Consumes: `Track`, `Ja`, `gsap`, `useGSAP`, `useMotionTier`.
- Produces: `<Music tracks />`, `NUMERALS`.

Signature move (spec): **the record spins.** The ensō (a brush circle) draws once, then the record turns, paused while it's off-screen and stopped under reduced motion. The setlist is numbered 壱弐参肆伍; the schema caps it at five.

- [ ] **Step 1: Write the failing test**

`components/chapters/Music.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Music } from "./Music";

const renderMusic = (tracks = FIXTURES.music) => render(<MotionTierContext.Provider value="none"><Music tracks={tracks} /></MotionTierContext.Provider>);

test("an ordered setlist numbered 壱 to 伍, numerals hidden from assistive tech", () => {
  const { container } = renderMusic();
  const items = container.querySelectorAll("ol > li");
  expect(items).toHaveLength(5);
  const numerals = [...container.querySelectorAll("[data-numeral]")];
  expect(numerals.map((n) => n.textContent).join("")).toBe("壱弐参肆伍");
  for (const n of numerals) expect(n).toHaveAttribute("aria-hidden", "true");
});

test("titles link only when a link was supplied", () => {
  renderMusic();
  expect(screen.getByRole("link", { name: "Fixture song 2" })).toHaveAttribute("href", "https://example.com/fixture");
  expect(screen.queryByRole("link", { name: "Fixture song 1" })).toBeNull();
});

test("the record is decorative", () => {
  const { container } = renderMusic();
  expect(container.querySelector("[data-record]")).toHaveAttribute("aria-hidden", "true");
});

test("one track still renders a one-item setlist", () => {
  const { container } = renderMusic([{ title: "Only one" }]);
  expect(container.querySelectorAll("ol > li")).toHaveLength(1);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/chapters/Music.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement**

`components/chapters/Music.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Ja } from "@/components/Ja";
import type { Track } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./Music.module.css";

export const NUMERALS = ["壱", "弐", "参", "肆", "伍"] as const;

const ENSO = "M100 18 C150 18 184 54 182 102 C180 150 142 184 98 182 C52 180 18 146 20 98 C22 62 46 32 82 22";

export function Music({ tracks }: { tracks: Track[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const [onScreen, setOnScreen] = useState(false);

  // Only spin while visible: no hidden work off-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (tier === "none") return;
      gsap.fromTo("[data-enso]", { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.music}>
      <div className={styles.record} data-record data-playing={onScreen} aria-hidden="true">
        <svg viewBox="0 0 200 200" className={styles.disc}>
          <circle cx="100" cy="100" r="96" className={styles.vinyl} />
          <circle cx="100" cy="100" r="28" className={styles.label} />
          <circle cx="100" cy="100" r="3" className={styles.hole} />
          <path d={ENSO} pathLength={1} strokeDasharray="1 1" className={styles.enso} data-enso />
        </svg>
      </div>
      <ol className={styles.setlist}>
        {tracks.map((t, i) => (
          <li key={`${t.title}-${i}`} className={styles.track}>
            <Ja aria-hidden="true" className={styles.numeral} data-numeral>{NUMERALS[i]}</Ja>
            <div>
              <p className={styles.title}>{t.link ? <a href={t.link}>{t.title}</a> : t.title}</p>
              {t.note && <p className={styles.note}>{t.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

`components/chapters/Music.module.css`:

```css
.music { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: clamp(2rem, 6vw, 5rem); align-items: center; }
.record { justify-self: center; width: min(100%, 22rem); }
.disc { width: 100%; height: auto; animation: spin 14s linear infinite; animation-play-state: paused; }
.record[data-playing="true"] .disc { animation-play-state: running; }
@keyframes spin { to { rotate: 360deg; } }
.vinyl { fill: #1d1b18; }
.label { fill: var(--seal); }
.hole { fill: var(--paper); }
.enso { fill: none; stroke: var(--paper); stroke-width: 6; stroke-linecap: round; opacity: 0.85; stroke-dashoffset: 0; }
.setlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.25rem; }
.track { display: grid; grid-template-columns: 3rem 1fr; gap: 1rem; align-items: baseline; }
.numeral { font-family: var(--font-brush), serif; font-size: 1.9rem; line-height: 1; color: var(--seal); }
.title { margin: 0; font-family: var(--font-heading), serif; font-size: 1.25rem; }
.note { margin: 0.25rem 0 0; color: var(--muted); }
@media (max-width: 767px) { .music { grid-template-columns: 1fr; } }
```

Check that seal-red numerals on autumn paper meet 3:1 (they're large, decorative and `aria-hidden`, but they should still read). `contrastRatio("#a8281f", "#f1e3cd")` is about 5.3.

In `ChapterBody.tsx`:

```tsx
case "music":
  return <Music tracks={content.music} />;
```

- [ ] **Step 4: Run the tests and see them pass, then commit**

Run: `npx vitest run && npx playwright test`. Expected: PASS.

```bash
git add components/chapters/Music.tsx components/chapters/Music.module.css components/chapters/Music.test.tsx components/chapters/ChapterBody.tsx
git commit -m "feat: add the Music ensō record and a setlist numbered 壱 to 伍" -m "Music is autumn: a brush-circle record that draws once and spins only while visible, beside a five-song setlist in formal numerals. The numerals are decorative; the ordered list carries the order for assistive tech." -m "Verified: unit tests for numbering, links, one-track and decorative record."
```

---

### Task 17: 趣 Hobbies: ema plaques

**Files:**
- Create: `components/chapters/Hobbies.tsx`, `components/chapters/Hobbies.module.css`, `components/chapters/Hobbies.test.tsx`
- Modify: `components/chapters/ChapterBody.tsx`

**Interfaces:**
- Consumes: `Hobby`, `Photo`, `gsap`, `useGSAP`, `useMotionTier`.
- Produces: `<Hobbies hobbies />`.

Signature move (spec): **drop in with an elastic ease, swing on hover.** The swing also runs on `:focus-within`, so keyboard users get it.

Accessibility note for the PR body (owner decision flagged): a plaque with nothing to operate isn't given a tab stop, because a focusable non-interactive element is an anti-pattern. Plaques with a link are reachable through that link; all plaques are readable in order by screen readers. This is how the plan reads the spec's "every plaque reachable and operable by keyboard".

- [ ] **Step 1: Write the failing test**

`components/chapters/Hobbies.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Hobbies } from "./Hobbies";

const renderHobbies = () => render(<MotionTierContext.Provider value="none"><Hobbies hobbies={FIXTURES.hobbies} /></MotionTierContext.Provider>);

test("one plaque per hobby, each with a heading", () => {
  renderHobbies();
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(FIXTURES.hobbies.map((h) => h.name));
});

test("links say what they lead to", () => {
  renderHobbies();
  expect(screen.getByRole("link", { name: "More about Fixture hobby two" })).toHaveAttribute("href", "https://example.com/fixture");
});

test("photos carry alt text", () => {
  renderHobbies();
  expect(screen.getByAltText("Fixture photo 30")).toBeInTheDocument();
});

test("reduced motion leaves plaques in place", () => {
  const { container } = renderHobbies();
  for (const el of container.querySelectorAll<HTMLElement>("[data-ema]")) expect(el.style.transform).toBe("");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run components/chapters/Hobbies.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement**

`components/chapters/Hobbies.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { Photo } from "@/components/Photo";
import type { Hobby } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import styles from "./Hobbies.module.css";

export function Hobbies({ hobbies }: { hobbies: Hobby[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const tier = useMotionTier();

  useGSAP(
    () => {
      if (tier === "none") return;
      gsap.from("[data-ema]", {
        y: -90, rotation: (i: number) => (i % 2 ? 8 : -8), autoAlpha: 0,
        duration: 1.1, ease: "elastic.out(1, 0.45)", stagger: 0.12,
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
    },
    { scope: ref, dependencies: [tier], revertOnUpdate: true },
  );

  return (
    <ul ref={ref} className={styles.ema}>
      {hobbies.map((h, i) => (
        <li key={`${h.name}-${i}`} className={styles.slot} data-ema>
          <span className={styles.peg} aria-hidden="true" />
          <article className={styles.plaque}>
            <h3 className={styles.name}>{h.name}</h3>
            <p className={styles.note}>{h.note}</p>
            {h.photo && <Photo photo={h.photo} sizes="16rem" className={styles.photo} />}
            {h.link && (
              <a href={h.link} className={styles.link}>
                More<span className="sr-only"> about {h.name}</span>
              </a>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
```

`components/chapters/Hobbies.module.css`:

```css
.ema { list-style: none; margin: 0; padding: 1rem 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem); }
.slot { position: relative; padding-top: 1.25rem; }
.peg { position: absolute; top: 0; left: 50%; width: 0.7rem; height: 0.7rem; translate: -50% 0; border-radius: 50%; background: #5b3a22; box-shadow: 0 2px 3px rgb(0 0 0 / 0.3); }
.plaque {
  position: relative; transform-origin: 50% -1.25rem;
  padding: 2.4rem 1.2rem 1.4rem; color: #1d1b18;
  background: linear-gradient(170deg, #e8cfa0, #d4b47c);
  clip-path: polygon(50% 0, 100% 16%, 100% 100%, 0 100%, 0 16%);
  box-shadow: inset 0 0 0 2px rgb(91 58 34 / 0.25);
}
.plaque::before { content: ""; position: absolute; top: 0.9rem; left: 50%; width: 1px; height: 1.3rem; background: var(--seal); translate: -50% -100%; }
.slot:hover .plaque, .slot:focus-within .plaque { animation: swing 1.4s ease-in-out; }
@keyframes swing { 0% { rotate: 0deg; } 20% { rotate: 4deg; } 45% { rotate: -3deg; } 70% { rotate: 1.5deg; } 100% { rotate: 0deg; } }
.name { margin: 0 0 0.4rem; font-size: 1.15rem; text-align: center; overflow-wrap: anywhere; }
.note { margin: 0; font-family: var(--font-hand), serif; }
.photo { width: 100%; height: auto; margin-top: 0.8rem; border-radius: 2px; }
.link { display: inline-block; margin-top: 0.8rem; color: #1d1b18; font-weight: 700; }
.link:focus-visible { outline-color: var(--seal); }
```

Ink `#1d1b18` on the plaque wood (`#d4b47c` at its darkest) is about 9:1. The plaque has its own fixed colours, so the late-autumn tint doesn't affect them.

In `ChapterBody.tsx`:

```tsx
case "hobbies":
  return <Hobbies hobbies={content.hobbies} />;
```

- [ ] **Step 4: Run the tests and see them pass, then commit**

Run: `npx vitest run && npx playwright test`. Expected: PASS.

```bash
git add components/chapters/Hobbies.tsx components/chapters/Hobbies.module.css components/chapters/Hobbies.test.tsx components/chapters/ChapterBody.tsx
git commit -m "feat: hang hobbies as ema plaques that drop in and swing" -m "Hobbies are wooden ema plaques on pegs: they drop in with an elastic ease and swing on hover or keyboard focus. Plaques without a link get no tab stop, since a focusable element with nothing to do is noise; links carry descriptive names." -m "Verified: unit tests for headings, link names, alt text and reduced motion."
```

---

### Task 18: 棚 Shelf: spines and the JRPG dialogue box

**Files:**
- Create: `lib/shelf.ts`, `lib/shelf.test.ts`, `lib/useTypewriter.ts`, `components/chapters/Shelf.tsx`, `components/chapters/Shelf.module.css`, `components/chapters/Shelf.test.tsx`
- Modify: `components/chapters/ChapterBody.tsx`

**Interfaces:**
- Consumes: `ShelfItem`, `useMotionTier`.
- Produces:
  - `splitPages(note: string): string[]` (pages are separated by a blank line)
  - `type DialogueState = { open: false } | { open: true; item: number; page: number; typed: boolean }`
  - `type DialogueAction = { type: "select"; item: number } | { type: "advance"; pages: number } | { type: "typed" } | { type: "close" }`
  - `dialogueReducer(s, a): DialogueState`
  - `useTypewriter(text: string, active: boolean, onDone: () => void): string`
  - `<Shelf items />`

Signature move (spec): **pull a spine to open a typewriter dialogue.** Game layer: the shelf is an inventory, spines are items, the dialogue box describes them, and Enter or Space advances. Here the dialogue's button takes focus when it opens, so Enter and Space work natively. Escape closes it and returns focus to the spine.

- [ ] **Step 1: Write the failing tests**

`lib/shelf.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { dialogueReducer, splitPages, type DialogueState } from "./shelf";

describe("splitPages", () => {
  test("splits on blank lines and trims", () => {
    expect(splitPages("One.\n\n  Two.  \n\n\nThree.")).toEqual(["One.", "Two.", "Three."]);
  });
  test("a single paragraph is one page", () => {
    expect(splitPages("Only.")).toEqual(["Only."]);
  });
  test("single newlines stay inside a page", () => {
    expect(splitPages("Line a\nline b")).toEqual(["Line a\nline b"]);
  });
});

describe("dialogueReducer", () => {
  const closed: DialogueState = { open: false };
  const open = (o: Partial<Extract<DialogueState, { open: true }>> = {}): DialogueState => ({ open: true, item: 0, page: 0, typed: false, ...o });

  test("select opens an item at its first page, untyped", () => {
    expect(dialogueReducer(closed, { type: "select", item: 2 })).toEqual(open({ item: 2 }));
  });
  test("selecting the open item again closes it (put the spine back)", () => {
    expect(dialogueReducer(open({ item: 2 }), { type: "select", item: 2 })).toEqual(closed);
  });
  test("selecting another item switches to it", () => {
    expect(dialogueReducer(open({ item: 0, page: 1, typed: true }), { type: "select", item: 1 })).toEqual(open({ item: 1 }));
  });
  test("advance while typing completes the page first", () => {
    expect(dialogueReducer(open(), { type: "advance", pages: 3 })).toEqual(open({ typed: true }));
  });
  test("advance on a typed page goes to the next page", () => {
    expect(dialogueReducer(open({ typed: true }), { type: "advance", pages: 3 })).toEqual(open({ page: 1 }));
  });
  test("advance on the last typed page closes", () => {
    expect(dialogueReducer(open({ page: 2, typed: true }), { type: "advance", pages: 3 })).toEqual(closed);
  });
  test("typed and advance do nothing while closed", () => {
    expect(dialogueReducer(closed, { type: "typed" })).toBe(closed);
    expect(dialogueReducer(closed, { type: "advance", pages: 2 })).toBe(closed);
  });
});
```

`components/chapters/Shelf.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Shelf } from "./Shelf";

const renderShelf = () => render(<MotionTierContext.Provider value="none"><Shelf items={FIXTURES.shelf} /></MotionTierContext.Provider>);

test("spines are buttons that control the dialogue", () => {
  renderShelf();
  const spine = screen.getByRole("button", { name: /Fixture manga/ });
  expect(spine).toHaveAttribute("aria-controls", "shelf-dialogue");
  expect(spine).toHaveAttribute("aria-expanded", "false");
});

test("pulling a spine opens the dialogue on its first page and focuses Next", async () => {
  const user = userEvent.setup();
  renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture manga/ }));
  expect(screen.getByRole("button", { name: /Fixture manga/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getAllByText("Fixture page one.")[0]).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Next/ })).toHaveFocus();
});

test("Enter advances through pages, then closes and returns focus to the spine", async () => {
  const user = userEvent.setup();
  renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture manga/ }));
  await user.keyboard("{Enter}");
  expect(screen.getAllByText("Fixture page two.")[0]).toBeInTheDocument();
  await user.keyboard(" ");
  expect(screen.getByRole("button", { name: /Close/ })).toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(screen.queryByRole("button", { name: /Close/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Fixture manga/ })).toHaveFocus();
});

test("Escape closes and returns focus to the spine", async () => {
  const user = userEvent.setup();
  renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture anime/ }));
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: /Fixture anime/ })).toHaveFocus();
  expect(screen.getByRole("button", { name: /Fixture anime/ })).toHaveAttribute("aria-expanded", "false");
});

test("the full page text is announced politely, not letter by letter", async () => {
  const user = userEvent.setup();
  const { container } = renderShelf();
  await user.click(screen.getByRole("button", { name: /Fixture game/ }));
  await act(async () => {});
  expect(container.querySelector("[aria-live='polite']")).toHaveTextContent("Fixture game with a long title. Fixture single page.");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/shelf.test.ts components/chapters/Shelf.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement the logic**

`lib/shelf.ts`:

```ts
export function splitPages(note: string): string[] {
  return note.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

export type DialogueState = { open: false } | { open: true; item: number; page: number; typed: boolean };
export type DialogueAction = { type: "select"; item: number } | { type: "advance"; pages: number } | { type: "typed" } | { type: "close" };

const CLOSED: DialogueState = { open: false };

export function dialogueReducer(s: DialogueState, a: DialogueAction): DialogueState {
  switch (a.type) {
    case "select":
      return s.open && s.item === a.item ? CLOSED : { open: true, item: a.item, page: 0, typed: false };
    case "typed":
      return s.open ? { ...s, typed: true } : s;
    case "advance":
      if (!s.open) return s;
      if (!s.typed) return { ...s, typed: true };
      return s.page < a.pages - 1 ? { ...s, page: s.page + 1, typed: false } : CLOSED;
    case "close":
      return CLOSED;
  }
}
```

`lib/useTypewriter.ts`:

```ts
"use client";
import { useEffect, useRef, useState } from "react";

const CHAR_MS = 28;

/** Reveals text a character at a time while active; shows it whole otherwise. */
export function useTypewriter(text: string, active: boolean, onDone: () => void): string {
  const [count, setCount] = useState(active ? 0 : text.length);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        window.clearInterval(id);
        done.current();
      }
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, [text, active]);

  return text.slice(0, count);
}
```

- [ ] **Step 4: Implement the component**

`components/chapters/Shelf.tsx`:

```tsx
"use client";
import { useEffect, useReducer, useRef } from "react";
import type { ShelfItem } from "@/lib/content/schema";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { dialogueReducer, splitPages } from "@/lib/shelf";
import { useTypewriter } from "@/lib/useTypewriter";
import styles from "./Shelf.module.css";

const KIND_LABEL: Record<ShelfItem["kind"], string> = { manga: "Manga", game: "Game", anime: "Anime" };

export function Shelf({ items }: { items: ShelfItem[] }) {
  const tier = useMotionTier();
  const [state, dispatch] = useReducer(dialogueReducer, { open: false });
  const spines = useRef<(HTMLButtonElement | null)[]>([]);
  const nextButton = useRef<HTMLButtonElement>(null);
  const lastItem = useRef<number | null>(null);

  const current = state.open ? items[state.item] : null;
  const pages = current ? splitPages(current.note) : [];
  const text = state.open ? (pages[state.page] ?? "") : "";
  const typing = state.open && !state.typed && tier !== "none";
  const typed = useTypewriter(text, typing, () => dispatch({ type: "typed" }));
  const visible = typing ? typed : text;
  const isLastPage = state.open && state.page === pages.length - 1;

  // Without the typewriter (reduced motion) a page is typed the moment it shows.
  useEffect(() => {
    if (state.open && !state.typed && tier === "none") dispatch({ type: "typed" });
  }, [state, tier]);

  // Opening moves focus to the dialogue's button; closing returns it to the spine.
  useEffect(() => {
    if (state.open) {
      lastItem.current = state.item;
      nextButton.current?.focus();
    } else if (lastItem.current !== null) {
      spines.current[lastItem.current]?.focus();
      lastItem.current = null;
    }
  }, [state.open, state.open && state.item]);

  const label = typing ? "Skip" : isLastPage ? "Close" : "Next";

  return (
    <div className={styles.shelf}>
      <ul className={styles.row} aria-label="Shelf">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`}>
            <button
              ref={(el) => {
                spines.current[i] = el;
              }}
              type="button"
              className={styles.spine}
              data-kind={item.kind}
              aria-expanded={state.open && state.item === i}
              aria-controls="shelf-dialogue"
              onClick={() => dispatch({ type: "select", item: i })}
            >
              <span className={styles.spineTitle}>{item.title}</span>
              <span className={styles.kind}>{KIND_LABEL[item.kind]}</span>
            </button>
          </li>
        ))}
      </ul>

      <div
        id="shelf-dialogue"
        className={styles.dialogue}
        data-open={state.open}
        onKeyDown={(e) => {
          if (e.key === "Escape") dispatch({ type: "close" });
        }}
      >
        {current ? (
          <>
            <p className={styles.speaker}>{current.title}</p>
            <p className={styles.text} aria-hidden="true">
              {visible}
              <span className={styles.caret} data-typing={typing} />
            </p>
            <button ref={nextButton} type="button" className={styles.next} onClick={() => dispatch({ type: "advance", pages: pages.length })}>
              {label}
              <span aria-hidden="true"> ▼</span>
            </button>
          </>
        ) : (
          <p className={styles.hint}>Pick something off the shelf.</p>
        )}
        <p className="sr-only" aria-live="polite">{current ? `${current.title}. ${text}` : ""}</p>
      </div>
    </div>
  );
}
```

`components/chapters/Shelf.module.css`:

```css
.shelf { display: grid; gap: 2rem; }
.row {
  list-style: none; margin: 0; padding: 1.5rem 1rem 0;
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.4rem;
  border-bottom: 0.9rem solid #5b3a22; box-shadow: 0 8px 12px -6px rgb(0 0 0 / 0.35);
}
.spine {
  display: flex; flex-direction: column; justify-content: space-between; align-items: center;
  width: 3.4rem; height: 15rem; padding: 0.8rem 0.3rem; border: 0; border-radius: 3px 3px 0 0;
  font: inherit; cursor: pointer; writing-mode: vertical-rl;
  transition: translate 0.25s ease, box-shadow 0.25s ease;
  box-shadow: inset -4px 0 0 rgb(0 0 0 / 0.18);
}
.spine[data-kind="manga"] { background: #e3d7bd; color: #1d1b18; }
.spine[data-kind="game"] { background: var(--brocade); color: #f1e8d6; }
.spine[data-kind="anime"] { background: #2b2925; color: #f1e8d6; }
.spine:hover { translate: 0 -0.4rem; }
.spine[aria-expanded="true"] { translate: 0 -1.2rem; box-shadow: inset -4px 0 0 rgb(0 0 0 / 0.18), 0 10px 18px rgb(0 0 0 / 0.3); }
.spineTitle { font-family: var(--font-heading), serif; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; max-height: 11rem; }
.kind { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; }

/* JRPG dialogue: dark box, double gold rule, a speaker tab. */
.dialogue {
  position: relative; min-height: 9rem;
  padding: 1.6rem 1.5rem 1.2rem; border-radius: 8px;
  background: #141826; color: #f1e8d6;
  box-shadow: inset 0 0 0 2px var(--gold), inset 0 0 0 5px #141826, inset 0 0 0 6px var(--gold);
}
.speaker {
  position: absolute; top: -0.9rem; left: 1.2rem; margin: 0;
  padding: 0.15rem 0.7rem; border-radius: 4px; background: var(--seal); color: #fff;
  font-family: var(--font-heading), serif; font-size: 0.9rem;
}
.text { margin: 0 0 1rem; font-size: 1.1rem; min-height: 3.4em; white-space: pre-line; }
.caret { display: inline-block; width: 0.55em; height: 1em; margin-left: 0.1em; vertical-align: -0.1em; background: currentColor; animation: blink 1s steps(1) infinite; }
.caret[data-typing="false"] { opacity: 0; }
@keyframes blink { 50% { opacity: 0; } }
.next { float: right; border: 0; background: none; color: #f2c14e; font: inherit; font-weight: 700; cursor: pointer; }
.next:focus-visible { outline-color: #f2c14e; }
.hint { margin: 0; color: #c9bfa8; font-style: italic; }
```

In `ChapterBody.tsx`:

```tsx
case "shelf":
  return <Shelf items={content.shelf} />;
```

- [ ] **Step 5: Run the tests and see them pass, then commit**

Run: `npx vitest run && npx playwright test`. Expected: PASS.

```bash
git add lib/shelf.ts lib/shelf.test.ts lib/useTypewriter.ts components/chapters/Shelf.tsx components/chapters/Shelf.module.css components/chapters/Shelf.test.tsx components/chapters/ChapterBody.tsx
git commit -m "feat: make the Shelf an inventory with a JRPG dialogue box" -m "Anime, manga and games are the owner's content, so the Shelf plays like a game menu: pull a spine and a dialogue types out what it is. The flow is a pure reducer so skip, next and close are testable; focus moves into the box and back to the spine, and screen readers hear whole pages, not letters." -m "Verified: unit tests for paging, reducer transitions, keyboard flow, Escape and the live region."
```

---

### Task 19: 縁 People: the red-thread map

**Files:**
- Create: `lib/thread.ts`, `lib/thread.test.ts`, `components/chapters/People.tsx`, `components/chapters/People.module.css`, `components/chapters/People.test.tsx`
- Modify: `components/chapters/ChapterBody.tsx`

**Interfaces:**
- Consumes: `Person`, `gsap`, `useGSAP`, `useMotionTier`.
- Produces: `type Point = { x: number; y: number }`, `threadPath(points: Point[]): string`, `<People people />`.

Signature move (spec): **the thread draws on scroll, nodes appear.** The people are laid out in normal flow, alternating sides, so long notes never overlap. The thread is drawn through measured knot positions and re-measured on resize.

- [ ] **Step 1: Write the failing tests**

`lib/thread.test.ts`:

```ts
import { expect, test } from "vitest";
import { threadPath } from "./thread";

test("no people, no thread; one person, just a starting point", () => {
  expect(threadPath([])).toBe("");
  expect(threadPath([{ x: 10, y: 20 }])).toBe("M10 20");
});

test("consecutive knots are joined by vertical-easing curves", () => {
  expect(threadPath([{ x: 0, y: 0 }, { x: 100, y: 200 }])).toBe("M0 0 C0 100 100 100 100 200");
});

test("coordinates are rounded to one decimal", () => {
  expect(threadPath([{ x: 0.123, y: 0 }, { x: 1.06, y: 1 }])).toBe("M0.1 0 C0.1 0.5 1.1 0.5 1.1 1");
});
```

`components/chapters/People.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { People } from "./People";

const renderPeople = (people = FIXTURES.people) => render(<MotionTierContext.Provider value="none"><People people={people} /></MotionTierContext.Provider>);

test("an ordered list of people with headings, relations and a knot each", () => {
  const { container } = renderPeople();
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(FIXTURES.people.map((p) => p.name));
  expect(container.querySelectorAll("[data-knot]")).toHaveLength(FIXTURES.people.length);
  expect(screen.getAllByText("Fixture relation")).toHaveLength(FIXTURES.people.length);
});

test("the thread is decorative", () => {
  const { container } = renderPeople();
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("names link only when a link was supplied", () => {
  renderPeople();
  expect(screen.getByRole("link", { name: "Fixture person B" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Fixture person A" })).toBeNull();
});

test("a single person renders without a thread curve", () => {
  const { container } = renderPeople([{ name: "Solo", relation: "Friend" }]);
  expect(container.querySelector("[data-thread]")?.getAttribute("d") ?? "").not.toContain("C");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/thread.test.ts components/chapters/People.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/thread.ts`:

```ts
export type Point = { x: number; y: number };

const r = (n: number) => Math.round(n * 10) / 10;

/** A soft red thread through each knot in order. */
export function threadPath(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const k = (b.y - a.y) * 0.5;
    d += ` C${r(a.x)} ${r(a.y + k)} ${r(b.x)} ${r(b.y - k)} ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}
```

`components/chapters/People.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { Person } from "@/lib/content/schema";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { threadPath } from "@/lib/thread";
import styles from "./People.module.css";

type Geometry = { d: string; w: number; h: number };

export function People({ people }: { people: Person[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useMotionTier();
  const [geom, setGeom] = useState<Geometry>({ d: "", w: 0, h: 0 });

  // The thread follows the real layout, so long notes can't break it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const points = [...el.querySelectorAll<HTMLElement>("[data-knot]")].map((k) => {
        const r = k.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      setGeom({ d: threadPath(points), w: box.width, h: box.height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [people.length]);

  useGSAP(
    () => {
      if (tier === "none" || !geom.d) return;
      gsap.fromTo("[data-thread]", { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: "none",
        scrollTrigger: { trigger: ref.current, start: "top 70%", end: "bottom 60%", scrub: 0.6 },
      });
      for (const node of gsap.utils.toArray<HTMLElement>("[data-node]")) {
        gsap.from(node, { autoAlpha: 0, scale: 0.85, duration: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: node, start: "top 70%", once: true } });
      }
    },
    { scope: ref, dependencies: [tier, geom.d], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={styles.map}>
      <svg className={styles.svg} width={geom.w} height={geom.h} viewBox={`0 0 ${geom.w || 1} ${geom.h || 1}`} aria-hidden="true">
        <path d={geom.d} pathLength={1} strokeDasharray="1 1" className={styles.thread} data-thread />
      </svg>
      <ol className={styles.nodes}>
        {people.map((p, i) => (
          <li key={`${p.name}-${i}`} className={styles.node} data-side={i % 2 === 0 ? "left" : "right"} data-node>
            <span className={styles.knot} data-knot aria-hidden="true" />
            <div>
              <h3 className={styles.name}>{p.link ? <a href={p.link}>{p.name}</a> : p.name}</h3>
              <p className={styles.relation}>{p.relation}</p>
              {p.note && <p className={styles.note}>{p.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

`components/chapters/People.module.css`:

```css
.map { position: relative; }
.svg { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
.thread { fill: none; stroke: var(--seal); stroke-width: 2.5; stroke-linecap: round; stroke-dashoffset: 0; }
.nodes { position: relative; list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(2rem, 5vw, 3.5rem); }
.node { width: min(100%, 26rem); display: flex; gap: 1rem; align-items: flex-start; }
.node[data-side="left"] { justify-self: start; }
.node[data-side="right"] { justify-self: end; flex-direction: row-reverse; text-align: right; }
.knot { flex: none; width: 1rem; height: 1rem; margin-top: 0.5rem; border-radius: 50%; background: var(--seal); box-shadow: 0 0 0 4px var(--paper); }
.name { margin: 0; font-size: 1.2rem; overflow-wrap: anywhere; }
.relation { margin: 0.1rem 0 0; color: var(--muted); font-size: 0.95rem; }
.note { margin: 0.4rem 0 0; font-family: var(--font-hand), serif; }
@media (max-width: 767px) {
  .node[data-side] { justify-self: stretch; flex-direction: row; text-align: left; }
}
```

In `ChapterBody.tsx`:

```tsx
case "people":
  return <People people={content.people} />;
```

- [ ] **Step 4: Run the tests and see them pass, then commit**

Run: `npx vitest run && npx playwright test`. Expected: PASS.

```bash
git add lib/thread.ts lib/thread.test.ts components/chapters/People.tsx components/chapters/People.module.css components/chapters/People.test.tsx components/chapters/ChapterBody.tsx
git commit -m "feat: connect people with a red thread drawn on scroll" -m "People is the last chapter: the red thread of fate runs through each person as you scroll. People sit in normal flow and the thread is measured from the real layout, so long notes or a narrow window can't detach the thread from its knots." -m "Verified: unit tests for the path maths, headings, links, one person and decorative SVG."
```

---

### Task 20: Sound toggle and the Konami crane

**Files:**
- Create: `lib/sound.ts`, `lib/sound.test.ts`, `lib/konami.ts`, `lib/konami.test.ts`, `components/game/SoundToggle.tsx`, `components/game/SoundToggle.module.css`, `components/game/Konami.tsx`, `components/game/Konami.module.css`, `components/game/game.test.tsx`
- Modify: `components/frame/Footer.tsx`, `components/rail/SealRail.tsx`, `components/chapters/Shelf.tsx`, `app/layout.tsx`, `lib/glossary.ts` (only if a new Japanese string appears)

**Interfaces:**
- Consumes: `readStorage` and `writeStorage`, `useMotionTier`, `gsap`, `useGSAP`, `Ja`.
- Produces:
  - `soundEnabled(): boolean`, `setSoundEnabled(on: boolean): void`, `subscribeSound(l: () => void): () => void`, `playTap(): void`, `__resetSoundForTests(): void`
  - `KONAMI: readonly string[]`, `konamiStep(progress: number, key: string): number`
  - `<SoundToggle />`, `<Konami />`

Spec: **sound is off by default.** A visible toggle turns on a soft wood-block tap, and the choice is remembered in `localStorage` (try/catch; the site works without it). The Konami code makes a crane fly across and a toast appear. Easter eggs never hide content.

- [ ] **Step 1: Write the failing tests**

`lib/sound.test.ts`:

```ts
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { __resetSoundForTests, playTap, setSoundEnabled, soundEnabled, subscribeSound } from "./sound";

beforeEach(() => {
  localStorage.clear();
  __resetSoundForTests();
});
afterEach(() => vi.restoreAllMocks());

test("off by default", () => {
  expect(soundEnabled()).toBe(false);
});

test("the choice is remembered across loads", () => {
  setSoundEnabled(true);
  __resetSoundForTests();
  expect(soundEnabled()).toBe(true);
});

test("still toggles for this visit when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  setSoundEnabled(true);
  expect(soundEnabled()).toBe(true);
});

test("subscribers hear about changes", () => {
  const l = vi.fn();
  const off = subscribeSound(l);
  setSoundEnabled(true);
  off();
  setSoundEnabled(false);
  expect(l).toHaveBeenCalledOnce();
});

test("playTap never throws, with or without Web Audio", () => {
  expect(() => playTap()).not.toThrow();
  setSoundEnabled(true); // jsdom has no AudioContext
  expect(() => playTap()).not.toThrow();
});
```

`lib/konami.test.ts`:

```ts
import { expect, test } from "vitest";
import { KONAMI, konamiStep } from "./konami";

const run = (keys: string[]) => keys.reduce(konamiStep, 0);

test("the full code completes", () => {
  expect(run([...KONAMI])).toBe(KONAMI.length);
});

test("letters are case-insensitive", () => {
  expect(run([...KONAMI.slice(0, 8), "B", "A"])).toBe(KONAMI.length);
});

test("a wrong key resets", () => {
  expect(run(["ArrowUp", "ArrowUp", "x"])).toBe(0);
});

test("an extra Up keeps the run alive (Up Up Up Down ...)", () => {
  expect(run(["ArrowUp", ...KONAMI])).toBe(KONAMI.length);
});

test("a wrong key that is itself Up starts a new run", () => {
  expect(run(["ArrowUp", "ArrowUp", "ArrowDown", "ArrowUp"])).toBe(1);
});
```

`components/game/game.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { KONAMI } from "@/lib/konami";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { __resetSoundForTests } from "@/lib/sound";
import { Konami } from "./Konami";
import { SoundToggle } from "./SoundToggle";

beforeEach(() => {
  localStorage.clear();
  __resetSoundForTests();
});

test("the sound toggle is a pressed/unpressed button named Sound, off at first", async () => {
  const user = userEvent.setup();
  render(<SoundToggle />);
  const button = screen.getByRole("button", { name: "Sound" });
  expect(button).toHaveAttribute("aria-pressed", "false");
  await user.click(button);
  expect(button).toHaveAttribute("aria-pressed", "true");
  expect(localStorage.getItem("kakejiku:sound")).toBe("on");
});

test("the Konami code shows a polite toast", () => {
  render(<MotionTierContext.Provider value="none"><Konami /></MotionTierContext.Provider>);
  const status = screen.getByRole("status");
  expect(status).toBeEmptyDOMElement();
  act(() => {
    for (const key of KONAMI) fireEvent.keyDown(window, { key });
  });
  expect(status).toHaveTextContent("A crane passes by.");
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run lib/sound.test.ts lib/konami.test.ts components/game`. Expected: FAIL.

- [ ] **Step 3: Implement the logic**

`lib/sound.ts`:

```ts
import { readStorage, writeStorage } from "./motion/storage";

const KEY = "kakejiku:sound";
const listeners = new Set<() => void>();
let enabled: boolean | null = null;
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  if (enabled === null) enabled = typeof window !== "undefined" && readStorage("local", KEY) === "on";
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  writeStorage("local", KEY, on ? "on" : "off");
  listeners.forEach((l) => l());
  if (on) playTap(); // confirm the choice audibly
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A soft wood-block tap: a short triangle blip with a fast decay. */
export function playTap(): void {
  if (!soundEnabled() || typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.13);
}

export function __resetSoundForTests(): void {
  enabled = null;
  listeners.clear();
}
```

`lib/konami.ts`:

```ts
export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"] as const;

/** Advances the match. Only "Up Up" overlaps itself, so a mismatched Up restarts at 1, or stays at 2 after Up Up. */
export function konamiStep(progress: number, key: string): number {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (k === KONAMI[progress]) return progress + 1;
  if (k === "ArrowUp") return progress === 2 ? 2 : 1;
  return 0;
}
```

The `"an extra Up keeps the run alive"` test walks Up, Up (2), Up (mismatch, stays 2), Down… which completes.

- [ ] **Step 4: Implement the components**

`components/game/SoundToggle.tsx`:

```tsx
"use client";
import { useSyncExternalStore } from "react";
import { setSoundEnabled, soundEnabled, subscribeSound } from "@/lib/sound";
import styles from "./SoundToggle.module.css";

export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundEnabled, () => false);
  return (
    <button type="button" className={styles.toggle} aria-pressed={on} onClick={() => setSoundEnabled(!on)}>
      Sound<span aria-hidden="true">: {on ? "on" : "off"}</span>
    </button>
  );
}
```

`components/game/SoundToggle.module.css`:

```css
.toggle { border: 1px solid currentColor; border-radius: 999px; padding: 0.3rem 0.9rem; background: none; color: inherit; font: inherit; font-size: 0.85rem; cursor: pointer; }
.toggle[aria-pressed="true"] { background: var(--seal); border-color: var(--seal); color: #fff; }
```

`components/game/Konami.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Ja } from "@/components/Ja";
import { KONAMI, konamiStep } from "@/lib/konami";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { playTap } from "@/lib/sound";
import styles from "./Konami.module.css";

const TOAST_MS = 4000;
const CRANE = "M8 38 Q34 8 58 30 Q82 6 112 16 Q88 28 72 33 L102 50 L62 41 Q38 52 8 38Z";

export function Konami() {
  const tier = useMotionTier();
  const crane = useRef<SVGSVGElement>(null);
  const progress = useRef(0);
  const [found, setFound] = useState(0);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      progress.current = konamiStep(progress.current, e.key);
      if (progress.current === KONAMI.length) {
        progress.current = 0;
        setFound((n) => n + 1);
        playTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!found) return;
    setToast(true);
    const t = window.setTimeout(() => setToast(false), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [found]);

  useGSAP(
    () => {
      if (!found || tier === "none" || !crane.current) return;
      gsap.fromTo(crane.current, { x: "-15vw", y: "12vh", autoAlpha: 1 }, { x: "115vw", y: "-4vh", duration: 4, ease: "sine.inOut", onComplete: () => gsap.set(crane.current, { autoAlpha: 0 }) });
    },
    { dependencies: [found, tier], revertOnUpdate: true },
  );

  return (
    <>
      <svg ref={crane} className={styles.crane} viewBox="0 0 120 60" aria-hidden="true">
        <path d={CRANE} />
      </svg>
      <div role="status" className={styles.toast} data-shown={toast}>
        {toast ? (
          <>
            <Ja aria-hidden="true" className={styles.mark}>鶴</Ja> A crane passes by.
          </>
        ) : null}
      </div>
    </>
  );
}
```

`components/game/Konami.module.css`:

```css
.crane { position: fixed; top: 20vh; left: 0; z-index: 45; width: clamp(5rem, 9vw, 8rem); fill: #f6f0e2; opacity: 0; visibility: hidden; pointer-events: none; filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3)); }
.toast { position: fixed; left: 1rem; bottom: 1rem; z-index: 50; max-width: 18rem; }
.toast[data-shown="true"] { padding: 0.6rem 1rem; border-radius: 6px; background: #141826; color: #f1e8d6; box-shadow: 0 0 0 2px var(--gold); }
.mark { font-family: var(--font-brush), serif; color: #f2c14e; margin-right: 0.35rem; }
```

- [ ] **Step 5: Wire them in, and play taps**

- `components/frame/Footer.tsx`: replace the Task 20 comment with `<p><SoundToggle /></p>`.
- `app/layout.tsx`: render `<Konami />` inside `MotionProvider`, after `{children}`.
- `components/rail/SealRail.tsx`: replace `// Task 20 adds playTap() here.` with `playTap();` and import it from `@/lib/sound`.
- `components/chapters/Shelf.tsx`: in the spine's `onClick`, call `playTap()` before dispatching.

- [ ] **Step 6: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test`. Expected: PASS. 鶴 is already in the glossary.

- [ ] **Step 7: Commit**

```bash
git add lib/sound.ts lib/sound.test.ts lib/konami.ts lib/konami.test.ts components/game components/frame/Footer.tsx components/rail/SealRail.tsx components/chapters/Shelf.tsx app/layout.tsx
git commit -m "feat: add an opt-in wood-block tap and the Konami crane" -m "The light game layer: sound stays off unless the visitor turns it on, the choice is remembered when storage allows, and the Konami code sends a paper crane across with a polite toast. Neither hides content, and reduced motion keeps the toast but drops the flight." -m "Verified: unit tests for default-off, persistence, blocked storage, Konami overlap handling and the toast."
```

---

### Task 21: 目録 Mokuroku: the plain index

**Files:**
- Create: `app/mokuroku/page.tsx`, `app/mokuroku/page.module.css`, `components/IndexBody.tsx`, `e2e/mokuroku.spec.ts`
- Modify: `e2e/navigation.spec.ts` (remove the `fixme`)

**Interfaces:**
- Consumes: `getContent`, `visibleChapters`, `GLOSSARY`, `formatDate`, `Ja`.
- Produces: the `/mokuroku` route and `<IndexBody id content />`.

Spec: a plain index page with **no motion**, and the full content as a simple list. It's linked from the skip link, the footer and the rail (done in Tasks 8 and 10). It also carries the glossary and the KanjiVG credit.

- [ ] **Step 1: Write the failing e2e test**

`e2e/mokuroku.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("plain index: one h1, a section per chapter, no motion", async ({ page }) => {
  await page.goto("/mokuroku");
  await expect(page.locator("h1")).toHaveText(/Index/);
  for (const label of ["About", "Events", "Music", "Hobbies", "Shelf", "People"]) {
    await expect(page.getByRole("heading", { level: 2, name: label })).toBeVisible();
  }
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("svg[data-phase], canvas, [data-ink-bleed]")).toHaveCount(0);
});

test("events link to their pages", async ({ page }) => {
  await page.goto("/mokuroku");
  await expect(page.getByRole("link", { name: "Fixture event 1" })).toHaveAttribute("href", "/events/fixture-event-1");
});

test("the glossary lists every Japanese term with reading and meaning", async ({ page }) => {
  await page.goto("/mokuroku");
  const table = page.getByRole("table", { name: "Japanese on this site" });
  await expect(table.getByRole("cell", { name: "目録" })).toBeVisible();
  await expect(table.getByRole("cell", { name: "mokuroku" })).toBeVisible();
});

test("credits KanjiVG", async ({ page }) => {
  await page.goto("/mokuroku");
  await expect(page.locator("main").getByRole("link", { name: "KanjiVG" })).toHaveAttribute("href", "http://kanjivg.tagaini.net");
});

test("no axe violations", async ({ page }) => {
  await page.goto("/mokuroku");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx playwright test e2e/mokuroku.spec.ts`. Expected: FAIL (404).

- [ ] **Step 3: Implement**

`components/IndexBody.tsx`. Server-only, no motion imports:

```tsx
import Link from "next/link";
import type { ChapterId } from "@/lib/chapters";
import type { SiteContent } from "@/lib/content/schema";
import { formatDate } from "@/lib/dates";

export function IndexBody({ id, content }: { id: ChapterId; content: SiteContent }) {
  switch (id) {
    case "about":
      return (
        <>
          {content.about.letter.map((p, i) => <p key={i}>{p}</p>)}
          {content.about.toolbox.length > 0 && <p>Toolbox: {content.about.toolbox.join(", ")}.</p>}
        </>
      );
    case "events":
      return (
        <ul>
          {content.events.map((e) => (
            <li key={e.slug}>
              <Link href={`/events/${e.slug}`}>{e.name}</Link>, {formatDate(e.date)}{e.place ? `, ${e.place}` : ""}. {e.summary}
            </li>
          ))}
        </ul>
      );
    case "music":
      return (
        <ol>
          {content.music.map((t, i) => (
            <li key={i}>{t.link ? <a href={t.link}>{t.title}</a> : t.title}{t.note ? `: ${t.note}` : ""}</li>
          ))}
        </ol>
      );
    case "hobbies":
      return (
        <ul>
          {content.hobbies.map((h, i) => (
            <li key={i}>{h.link ? <a href={h.link}>{h.name}</a> : h.name}: {h.note}</li>
          ))}
        </ul>
      );
    case "shelf":
      return (
        <ul>
          {content.shelf.map((s, i) => (
            <li key={i}>{s.title} ({s.kind}): {s.note.replace(/\s*\n\s*\n\s*/g, " ")}</li>
          ))}
        </ul>
      );
    case "people":
      return (
        <ul>
          {content.people.map((p, i) => (
            <li key={i}>{p.link ? <a href={p.link}>{p.name}</a> : p.name}, {p.relation}{p.note ? `. ${p.note}` : ""}</li>
          ))}
        </ul>
      );
  }
}
```

`app/mokuroku/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { IndexBody } from "@/components/IndexBody";
import { Ja } from "@/components/Ja";
import { visibleChapters } from "@/lib/chapters";
import { getContent } from "@/lib/content/load";
import { GLOSSARY } from "@/lib/glossary";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Index · Miel", description: "Everything on Miel's scroll, as a plain list." };

export default async function Mokuroku() {
  const content = await getContent();
  const chapters = visibleChapters(content);

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <h1>
        Index <Ja className={styles.ja}>目録</Ja>
      </h1>
      <p>
        Everything on the scroll, as a plain list with no motion. <Link href="/">Back to the scroll</Link>
      </p>

      {chapters.length === 0 ? (
        <p>Nothing on the scroll yet.</p>
      ) : (
        <nav aria-label="Sections">
          <ul>
            {chapters.map((c) => (
              <li key={c.id}><a href={`#index-${c.id}`}>{c.label}</a></li>
            ))}
          </ul>
        </nav>
      )}

      {chapters.map((c) => (
        <section key={c.id} id={`index-${c.id}`} aria-labelledby={`index-${c.id}-title`}>
          <h2 id={`index-${c.id}-title`}>{c.label}</h2>
          <IndexBody id={c.id} content={content} />
        </section>
      ))}

      <section aria-labelledby="glossary-title">
        <h2 id="glossary-title">Japanese on this site</h2>
        <table aria-labelledby="glossary-title" className={styles.glossary}>
          <thead>
            <tr><th scope="col">Term</th><th scope="col">Reading</th><th scope="col">Meaning</th></tr>
          </thead>
          <tbody>
            {GLOSSARY.map((g) => (
              <tr key={g.term}><td><Ja>{g.term}</Ja></td><td>{g.reading}</td><td>{g.meaning}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="credits-title">
        <h2 id="credits-title">Credits</h2>
        <p>
          Stroke order data: <a href="http://kanjivg.tagaini.net">KanjiVG</a> by Ulrich Apel,{" "}
          <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Fonts from Google Fonts under the OFL.
        </p>
      </section>
    </main>
  );
}
```

`app/mokuroku/page.module.css`:

```css
.page { max-width: 44rem; margin: 0 auto; padding: 3rem 1.25rem 5rem; background: var(--paper); color: var(--ink); min-height: 100vh; }
.page h2 { margin-top: 2.5rem; }
.ja { font-family: var(--font-brush), serif; color: var(--muted); margin-left: 0.4rem; }
.glossary { width: 100%; border-collapse: collapse; }
.glossary th, .glossary td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid color-mix(in srgb, var(--ink) 18%, transparent); vertical-align: top; }
```

In `e2e/navigation.spec.ts`, change `test.fixme("no smooth scrolling on the plain index (enable in Task 21)"` to `test("no smooth scrolling on the plain index"`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npx vitest run && npx playwright test`. Expected: PASS, with no `fixme` left (`grep -rn "fixme" e2e` prints nothing).

- [ ] **Step 5: Commit**

```bash
git add app/mokuroku components/IndexBody.tsx e2e/mokuroku.spec.ts e2e/navigation.spec.ts
git commit -m "feat: add 目録, a plain motion-free index of everything" -m "Anyone who doesn't want the scroll, or can't use it, gets every piece of content as plain lists, plus the glossary of every Japanese term and the KanjiVG credit. It's the target of the second skip link, the footer and the rail." -m "Verified: e2e for structure, no motion, event links, glossary, credit and axe."
```

---

### Task 22: Hardening: live reduced motion, phones, performance and release

**Files:**
- Create: `e2e/reduced-motion-live.spec.ts`, `e2e/mobile.spec.ts`
- Modify: whatever the checks below turn up, plus `CLAUDE.md` (status)

**Interfaces:**
- Consumes: everything.
- Produces: the M4 PR, and a release-ready site that waits for real content.

- [ ] **Step 1: Write the live reduced-motion e2e test (Review Focus #1)**

`e2e/reduced-motion-live.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

/** The invariant: nothing in the page is left hidden, clipped, half-drawn or moving. */
async function expectSettled(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-tier", "none");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-entrance-phase]")).toHaveAttribute("data-entrance-phase", "done");
  const report = await page.evaluate(() => ({
    clipped: getComputedStyle(document.querySelector("[data-hero]")!).clipPath,
    unwritten: [...document.querySelectorAll("svg[data-phase]")].filter((s) => s.getAttribute("data-phase") !== "done").length,
    bleeding: [...document.querySelectorAll<HTMLElement>("[data-ink-bleed]")].filter((el) => el.style.getPropertyValue("--r") !== "").length,
    hidden: [...document.querySelectorAll<HTMLElement>("[style]")].filter((el) => el.style.opacity === "0" || el.style.visibility === "hidden").length,
    tilted: [...document.querySelectorAll<HTMLElement>("[data-tilt]")].filter((el) => el.style.transform !== "").length,
    clippedLines: [...document.querySelectorAll<HTMLElement>("[data-letter-line]")].filter((el) => el.style.clipPath !== "").length,
  }));
  expect(report).toEqual({ clipped: expect.not.stringContaining("100%"), unwritten: 0, bleeding: 0, hidden: 0, tilted: 0, clippedLines: 0 });
}

test("switching on reduced motion mid-entrance settles everything", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(400); // mid-unroll
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectSettled(page);
});

test("switching on reduced motion mid-scroll settles everything", async ({ page }) => {
  await page.goto("/#about");
  await page.keyboard.press("2"); // Events: prints bleeding, gust blowing
  await page.mouse.move(700, 500); // a tile may be tilting
  await page.waitForTimeout(250);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectSettled(page);
});

test("turning it back off restores smooth scroll without a reload", async ({ page }) => {
  await page.goto("/#music");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/lenis/);
});
```

If `hidden` fails, find the element (log `outerHTML` of the matches). The cause is a tween that wasn't created inside a reverting `useGSAP` or `gsap.context`. Fix it **at the class**: search every `gsap.` call outside `useGSAP` (`grep -rn "gsap\.\(to\|from\|fromTo\|set\)" components lib | grep -v useGSAP`) and check each one, not just the one that failed.

- [ ] **Step 2: Write the phone e2e test**

`e2e/mobile.spec.ts`:

```ts
import { devices, expect, test } from "@playwright/test";

test.use({ ...devices["iPhone 13"], reducedMotion: "no-preference" });

for (const path of ["/", "/events/fixture-event-1", "/mokuroku"]) {
  test(`${path} reads on a phone with no sideways scroll`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("phones get light motion: no Lenis, no entrance, no weather", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-tier", "lite");
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  await expect(page.locator("[data-entrance-phase]")).toHaveAttribute("data-entrance-phase", "done", { timeout: 1_500 });
  await page.goto("/#about");
  await page.evaluate(() => document.getElementById("events")!.scrollIntoView());
  await page.waitForTimeout(500);
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("every chapter heading is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h2")).toHaveCount(6);
});
```

- [ ] **Step 3: Run them and fix what fails**

Run: `npx playwright test`. Expected: PASS after fixes. Each fix is its own commit, `fix: …`, naming the cause.

- [ ] **Step 4: Worst-case content pass**

Run the `break-ui` skill on Events, Shelf and People with the fixtures, plus any extra worst cases it suggests (an emoji in a name, a 300-character note, a single event, one hobby). Fix what breaks. Commit any new worst cases worth keeping by adding them to `lib/content/fixtures.ts`, and keep the schema test "accepts the fixtures" green.

- [ ] **Step 5: Production performance check (spec: "to verify in planning")**

The production build refuses fixtures, so copy them into the seed **temporarily**. `fixtures.ts` only has a type-only import, so Node can load it by stripping types (Node 22.6+):

```bash
git status   # must be clean
node --experimental-strip-types --input-type=module -e "import('./lib/content/fixtures.ts').then(async (m) => (await import('node:fs')).writeFileSync('lib/content/seed.json', JSON.stringify(m.FIXTURES, null, 2)))"
npm run build && npm start
# ...measure...
git checkout lib/content/seed.json   # restore before doing anything else
```

The `seed.json never contains fixture text` unit test fails if the restore is forgotten, so run `npm test` before any commit.

In Chrome DevTools > Performance, with 4× CPU throttling at 1440×900, record the entrance, then a slow scroll from About to People:
- Average frame time under 16.7ms during the gust and while scrolling the bento.
- No long task over 50ms after load.
- Lighthouse (desktop) Performance ≥ 90, Accessibility 100.

Write the numbers in the PR body. If a budget fails, profile it, fix the cause (usually too many simultaneous ScrollTriggers or unthrottled pointer handlers), and re-measure.

- [ ] **Step 6: Full verification from a clean checkout**

```bash
git status                     # clean
npm ci
npm run typecheck
npm test                       # note the count
npm run test:e2e               # note the count
npm run build                  # with the real (empty or owner-filled) seed
```

All must pass. Record the counts for the PR body, taken from this run (git-operations: "An unverifiable count is worse than none").

- [ ] **Step 7: Reviews**

Run `/review-pr` on the M4 branch diff and the `experience-reviewer` agent on all of `app/`, `components/`, `lib/` and `e2e/` (this is the first time the whole site exists). Fix every Critical and Important finding. Check the items listed under "check in browser" in the browser. Then run `code-simplifier` as the last pass.

- [ ] **Step 8: Update the project status**

In `CLAUDE.md`, change "Status: World chosen, spec in review" to:

```md
## Status: Public site built, waiting for content

The Kakejiku public site is implemented (plan: `docs/superpowers/plans/2026-10-13-kakejiku-public-site.md`).
`lib/content/seed.json` is empty until the owner supplies material through `content-inbox/`;
empty chapters stay hidden. Next: the content-model spec (Supabase, photo hosting), then
the admin port.
```

Move "View Transitions support in Next.js 16" out of "Still open", and record the decision from Task 15.

- [ ] **Step 9: Commit and open the PR**

```bash
git add e2e/reduced-motion-live.spec.ts e2e/mobile.spec.ts CLAUDE.md
git commit -m "test: pin live reduced motion and phone behaviour across the site" -m "These are the two promises the spec makes everywhere at once: switching reduced motion on mid-animation leaves nothing hidden or moving, and phones get the same content with light motion and no sideways scroll." -m "Verified: full unit and e2e suites from a clean checkout; production build; DevTools and Lighthouse numbers in the PR."
```

Push and open the M4 PR following git-operations. The body includes the verification counts, the performance numbers, the reviewers that ran and what they found, screenshots at 390px and 1440px, a short recording of the entrance and a chapter change, a reduced-motion capture, and "Owner: please check the glossary" if it changed. No attribution footer.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Hanging-scroll frame: cord, roller, brocade, aged paper, 終 on the bottom roller | 8 |
| Palette with seal red as the only strong accent; seasons only tint | 1, 8, 12 |
| Four typefaces, one job each | 1 |
| Japanese as decoration, glossary, checked before shipping | 3 (scan), 21 (published), owner check in the M1 PR |
| Generated art for textures only; content images are the owner's | 8 (procedural mountains, CSS paper), 2 (schema: photos under `public/`) |
| Hero: Sumi menu, six columns, ink mountains, no portrait | 8, test in `structure.spec.ts` |
| Seal rail after the hero; keys 1–6 | 10 |
| Six chapters in order, each with a season and one signature move | 3, 12, 13–19 |
| Event pages with a tile-to-header morph (verified, with fallback) | 15 |
| 目録 plain index, linked from skip link, footer and rail | 8, 10, 21 |
| Entrance: unroll, mountains soak in, ミエル written, menu staggers; skipped for repeat visits in the session | 11 |
| Chapter kanji in real stroke order (KanjiVG), look B, motion A | 4, 6 |
| Ink bleed, brush divider, seal stamp | 7 |
| Seasons: wall tint tween, one gust per change, nothing continuous | 12 |
| Lenis + GSAP ScrollTrigger, contexts revert on unmount | 5, 9 (and every motion task) |
| Reduced motion works live | 5, 6, 7, 9, 11, 12, 22 |
| Keyboard 1–6, Shelf inventory with dialogue (Enter/Space) | 10, 18 |
| Sound off by default, remembered, try/catch | 20 |
| Konami crane and toast, never hiding content | 20 |
| Content rules: nothing invented, events attended, one candid, toolbox limited, no phone number | 2, 3, 13, 15 |
| Accessibility: skip links, heading levels, keyboard, focus on paper and dark wall, AA contrast, no scroll-jacking | 1, 8, 9, 10, 22 (axe in 8, 15, 21) |
| KanjiVG CC BY-SA credit in footer and on 目録 | 4, 8, 21 |
| To verify: View Transitions, Lenis with the App Router, weather and bento performance | 15, 9, 12, 22 |
| Desktop first; phones get the content without heavy motion | 5 (lite tier), 22 |

**Deliberate interpretations to confirm with the owner** (each also goes in its PR body):

- **Heading seals:** each chapter heading's seal shows the chapter kanji (私, 祭…), and each brush divider ends in the season glyph (春夏秋霜冬梅). The spec names both seals but not their glyphs. 霜 (frost) stands for late autumn.
- **Plaques without links get no tab stop** (Task 17). They're readable in order, but there's nothing to operate.
- **The plain index is text only.** Photos live on the event pages, which it links to.
- **Empty chapters are hidden everywhere**, rather than shown with a placeholder.
