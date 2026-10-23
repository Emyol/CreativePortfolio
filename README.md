# CreativePortfolioV2

Miel's creative / personal portfolio: the person, not the CV. The professional
portfolio lives in a separate repo.

The site is **Side A**: a pocket tape player Miel built. The hero is the device seen
top down, six tracks play across two sides with a flip in between, and each event
gets its own "live recording" page. Content is edited at `/admin` and stored in
Supabase.

## Stack

Next.js, React, TypeScript, CSS Modules, GSAP + Lenis, three.js, Zod. Tests run on
Vitest and Playwright.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run dev:fixtures` | Dev server with clearly fake fixture content |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, fixtures server on port 3100) |
| `npm run build` | Production build |
| `npm run device:glb` | Export the 3D player model from Blender |

## Docs

- Admin setup: `docs/admin-setup.md`
- Specs and plans: `docs/superpowers/`
- Raw content drop: `content-inbox/README.md`
