# CreativePortfolioV2

Amiel Josiah "Miel" Acuña's **creative / personal portfolio**: the person, not the CV.
It is a separate site from the professional portfolio at `../portfolioV2`
(live at project-miel.vercel.app).

## Status: World chosen, spec in review

The theme/World and site shape are decided: **Kakejiku**, a hanging scroll read top to
bottom (spec: `docs/superpowers/specs/2026-10-13-kakejiku-world-design.md`). Nothing is
scaffolded and no dependencies are installed yet.

- Do not scaffold the app or install packages until the owner approves the spec and
  the implementation plan.
- Next step after spec approval: `superpowers:writing-plans`.
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
| World and site shape | **Kakejiku** hanging scroll: Sumi menu hero that becomes a seal rail, six seasonal chapters, smooth vertical scroll, a page per event, plain 目録 index. See the spec |
| Motion | Kanji written in real stroke order (KanjiVG, credit required), ink bleed, brush dividers, seal stamps, one signature move per component, live reduced motion |
| Priority | Desktop first, one to four weeks |

## Still open

- View Transitions support in Next.js 16 for the event-page morph (verify in planning).
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

Uses the owner's global `~/.claude` setup, with the kislap agent setup vendored and
tailored in `.claude/`:

- **git-operations** (project copy in `.claude/skills/git-operations/`, which overrides
  the global one): one branch per task named by subject (`feat/events-section`),
  conventional commits explaining *why*, commit verified work proactively, run
  `/review-pr` + `experience-reviewer` before opening a PR. **Push feature branches and
  open PRs without asking.** Ask before pushing `main`, force-pushing, merging, or
  creating the remote. **No Claude attribution** on commits or PRs: no
  `Co-Authored-By`, no "Generated with" footer. This overrides the harness default.
  Never stage `.env*`, secrets or scratch.
- **superpowers**: brainstorming -> writing-plans -> subagent-driven or executing-plans;
  TDD and verification-before-completion apply to code.
- **Next.js**: once installed, `AGENTS.md` (written by `next dev`) warns this Next.js has
  breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before
  writing Next code.
- Carry over from portfolioV2: skip link, real headings, keyboard navigation, visible
  focus, contrast, and `prefers-reduced-motion` that works live, not only at load.

## Project agent setup

Vendored from kislap (`.claude/pr-review-toolkit/README.md` lists it): the six review agents,
`/review-pr`, and a tailored `git-operations` skill. Added for this project: the
**`experience-reviewer`** agent (accessibility, live reduced-motion, GSAP cleanup,
performance, content rules) and the `design-inspiration` skill.

`.claude/settings.json` (committed) adds three things on top of the global setup:

- the **Impeccable** design-detector hook (checks after each Edit/Write, deep pass on
  Stop; it no-ops if the global skill is missing),
- the official **`gsap-skills`** plugin (GreenSock: core, timeline, ScrollTrigger,
  plugins, React, performance),
- read-only `WebFetch` access to the inspiration sites in
  `.claude/skills/design-inspiration/sources.md`.

## Skill map

Which skill at which phase. Process skills set the approach and craft skills carry it out.
Several global taste skills overlap. Use the ones listed here, and don't stack
competing style presets (e.g. `industrial-brutalist-ui` *and* `minimalist-ui`) unless
the chosen World calls for it.

| Phase | Skills |
|---|---|
| Sharpen an idea or decision | `/grill-me` (mattpocock `grilling`) to stress-test before committing to it |
| Shape and theme/World | `superpowers:brainstorming` (done: Kakejiku), fed by `design-inspiration` boards in `docs/inspiration/` |
| Gather references and components | `design-inspiration` (project skill), `animation-vocabulary` to name effects |
| Spec, then plan | `superpowers:brainstorming` writes the spec, then `superpowers:writing-plans` |
| Answer a design question by building | `mattpocock-skills:prototype` (throwaway, not the real app) |
| Visual design and taste | `emil-design-eng` (polish and the invisible details), `impeccable` (critique/audit/polish), `design-taste-frontend` (anti-template guardrails) |
| Motion | `animate` (build), the `gsap-skills` plugin (GSAP API), `apple-design` (springs, gestures), `review-animations` / `improve-animations` (critique), `find-animation-opportunities` |
| Build | `superpowers:subagent-driven-development` or `executing-plans`, `superpowers:test-driven-development`, `pick-ui-library` before adding a dependency |
| Harden | `mobile-native`, `break-ui` (worst-case content), `design:accessibility-review`, `superpowers:verification-before-completion` |
| Review | `/review-pr` (vendored toolkit) + `experience-reviewer` agent for any UI/content change |
| Ship | `git-operations` (project copy) |
