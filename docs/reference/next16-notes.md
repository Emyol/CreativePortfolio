# Next.js 16 notes

Read from `node_modules/next/dist/docs/` (Next 16.4.0) on 2026-10-13, before writing Next code.
Paths below are relative to `node_modules/next/dist/docs/01-app/`.

- **View transitions** (`02-guides/view-transitions.md`): work in the App Router with **no
  configuration**. React 19.3 exports `ViewTransition` from `react` (not `unstable_`). Route
  navigations are transitions, so a `<ViewTransition name="x">` on the old and new page morphs
  automatically. Use `share="morph" default="none"` on both sides so named elements don't
  crossfade on unrelated transitions (with `default="none"` the `share` prop is required).
  Reduced motion: zero `animation-duration` on `::view-transition-*` under
  `prefers-reduced-motion: reduce`. Unsupported browsers just don't animate.
- **Pre-paint inline script** (`02-guides/preventing-flash-before-hydration.md`): a `<script
  dangerouslySetInnerHTML>` in `<head>` of the root layout runs before first paint; put
  `suppressHydrationWarning` on `<html>` when it changes attributes. To avoid React's dev
  warning about rendering `<script>`, use an `InlineScript` helper that sets
  `type="text/javascript"` on the server and `text/plain` on the client.
- **`params` is a Promise** (`02-guides/upgrading/version-16.md`, "Async Request APIs"): page
  props are `{ params: Promise<{ slug: string }> }`; `await params`.
- **`generateStaticParams`** (`03-api-reference/04-functions/generate-static-params.md`): must
  always return an array, empty is allowed; `export const dynamicParams = false` makes unknown
  slugs 404.
- **Fonts** (`01-getting-started/13-fonts.md`): `next/font/google` with `variable` for CSS vars;
  `subsets` needed when preloading.
- **Scroll behaviour** (`version-16.md`, "Scroll Behavior Override"): Next 16 no longer forces
  `scroll-behavior: auto` during navigation unless `<html data-scroll-behavior="smooth">`.
- **`next lint` removed** (`version-16.md`, "Removals"); this repo uses `tsc --noEmit` instead.
- **Turbopack by default**; `next dev` writes to `.next/dev` and a lockfile stops two
  `next dev` instances on one project (so stop a manual dev server before `npm run test:e2e`
  unless Playwright reuses it).
- **`middleware` renamed `proxy`** (relevant to the later admin port).

## Event morph (decided in Task 15)

Path A: React 19.3's `ViewTransition` (imported from `react`, no `next.config` flag needed)
wraps the event cover photo on both the bento tile and the event page with
`name="event-photo-<slug>" share="morph" default="none"`. Reduced motion zeroes the
`::view-transition-*` animations, both via the media query and live via `html[data-tier="none"]`.
