# CreativePortfolioV2

Amiel Josiah "Miel" Acuña's **creative / personal portfolio**: the person, not the CV.
It is a separate site from the professional portfolio at `../portfolioV2`
(live at project-miel.vercel.app).

## Status: pre-design

Theme, visual direction and site shape are **deliberately undecided** (owner: "plan the
theme later"). Nothing is scaffolded and no dependencies are installed.

- Do not pick a theme, scaffold the app, or install packages unless asked.
- The superpowers brainstorming flow is paused at the **site shape** question
  (scrapbook scroll / album / explorable room). Resume there when the owner is ready.
- Brainstorm -> spec (`docs/superpowers/specs/`) -> plan (`docs/superpowers/plans/`)
  -> execute. No implementation before the spec is approved.

## Decisions made

| Decision | Choice |
|---|---|
| Audience | Peers, friends, collaborators. Personality first, **no hiring angle** |
| Content | Personality, events **attended**, music, hobbies and things made, people and communities |
| Capability layer | Light: languages and frameworks as a supporting "toolbox", never the headline |
| Updating content | **Reuse the Supabase admin editor** from portfolioV2 (owner chose this over files-only) |
| Tech base (assumed, confirm) | Next.js 16, because the admin is Next route handlers + `proxy.ts` |
| Decomposition | 1) content model + public site, 2) admin port. Separate spec, plan and build for each |

## Still open

- **Site shape** and **theme/World** (later, by owner's choice).
- **Photo hosting.** Supabase free projects pause when inactive and uploaded media needs
  Supabase up. Recommended: launch photos live in `public/` under Git, uploads only for
  new ones. Decide in the spec.
- **Supabase project.** The migration is single-document (`portfolio_draft` /
  `portfolio_published`), so this site needs **its own project**, not portfolioV2's.
- Domain and hosting.

## Content rules

- **Never invent** events, hobbies, stories, photos or skill claims. The owner supplies
  material; drop it in `content-inbox/` (see its README).
- "Events" means events Miel **attended**. Events he organised or competed in are on the
  professional site; reference them only if the owner asks.
- **No phone number** anywhere (owner confirmed removal in the V1 attempt).
- Keep claims to what the professional content already supports for the toolbox layer.

## Reference material

- Professional content and what is reusable: `docs/reference/professional-inventory.md`
- Admin reuse map (files, hard-coded lists, migration): same file, last section.
- `../portfolioV2/lib/content/seed.json` is the factual source for anything professional.
- `../CreativePortfolio` is an abandoned, uncommitted Astro attempt (warm paper "Ink in
  Practice" look, still recruiter-oriented). Its `ThemeInspo/` holds six inspiration
  images for when the theme is planned. Reference only; do not build on it.
- portfolioV2 calls the visual system a **World** (see its `CONTEXT.md`); "theme" is the
  owner's word. Same idea.

## Working agreements

Uses the owner's global `~/.claude` setup:

- **git-operations**: one branch per task named by subject (`feat/events-section`),
  conventional commits explaining *why*, commit verified work proactively, run
  `/review-pr` before opening a PR, ask before pushing or force-pushing, never push to
  the default branch directly, never stage `.env*`, secrets or scratch.
- **superpowers**: brainstorming -> writing-plans -> subagent-driven or executing-plans;
  TDD and verification-before-completion apply to code.
- **Next.js**: once installed, `AGENTS.md` (written by `next dev`) warns this Next.js has
  breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before
  writing Next code.
- Carry over from portfolioV2: skip link, real headings, keyboard navigation, visible
  focus, contrast, and `prefers-reduced-motion` that works live, not only at load.
