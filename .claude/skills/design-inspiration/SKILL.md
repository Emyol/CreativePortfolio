---
name: design-inspiration
description: Browse award and showcase sites (Awwwards, GSAP showcase, Codrops, Godly, FWA and similar) and component libraries (GSAP demos, React Bits, Motion examples) for references, then log what makes each one work in docs/inspiration/. Use when the owner asks for inspiration, references, "sites like X", a technique ("how do sites do that scroll thing?"), or a component to borrow from, and at the start of theme/World or site-shape work.
---

# Design Inspiration

Collect **references, not decisions**. Find sites and components, work out *why* each
one works and *how* it is built, then log it. The theme/World and site shape are the
owner's calls (see `CLAUDE.md`). This skill feeds those decisions. It does not make them.

## Before browsing

1. Read `docs/inspiration/README.md` and skim existing boards so you don't re-log sites.
2. Pin the brief in one line: what is being looked for (a mood, a layout, a
   technique, a component) and for which part of the site. If the owner gave no
   brief, ask for one. Don't browse aimlessly.
3. Remember the audience: peers and friends, personality first. Agency and
   product-launch sites are useful for **technique**. Personal sites are useful for
   **voice**. Label which one each reference is for.

## Where to look

Pick sources from [sources.md](sources.md) by brief: award galleries for mood and
layout, the GSAP showcase and Codrops for scroll and motion technique, component
libraries for a specific piece. Three to six strong references beat twenty weak ones.

## How to browse

| Need | Tool |
|---|---|
| Listing pages, articles, docs (Awwwards lists, GSAP showcase/docs) | `WebFetch`, which reads text and links but no motion |
| Sites that block fetch (Codrops returns 403), JS-only galleries, or **anything where motion matters** | Browser: load `claude-in-chrome` (or `anthropic-skills:chrome-browser`), then screenshot, scroll, and record what moves |
| Find a technique by name | Use `WebSearch` first, then fetch the best hit |

You cannot judge motion from text. If a reference is in the log for its motion,
you must have watched it in a browser, or the entry says "**motion unverified**:
owner to watch". Don't describe animation you didn't see.

Name effects precisely. If you're unsure what an effect is called, load
`animation-vocabulary`.

## What to record

For each reference, one entry in the board (format in `docs/inspiration/README.md`):

- **What** it is and the link (the live URL, plus the gallery page that surfaced it).
- **Why it works** in one or two sentences on the idea, not adjectives.
  ("Type is the image: the name is set huge and the photos sit inside the letterforms"
  beats "bold and modern".)
- **How it's built**: the stack and technique as far as you can tell. Look for GSAP
  ScrollTrigger pins, Lenis smooth scroll, WebGL/Three.js, SplitText, CSS
  scroll-driven animation, View Transitions. Say "inferred" when you're guessing from
  behaviour.
- **Steal / avoid**: the one thing worth taking, and anything that would hurt this
  site (scroll-jacking that breaks keyboard nav, motion with no reduced-motion path,
  low-contrast text).
- **Fit**: technique, voice, or both.

Screenshots go in `docs/inspiration/shots/`, which is gitignored and stays local because
it is other people's work.

## Rules

- **Never copy** a site's code, assets, copy or layout wholesale. Record the idea and
  rebuild it. Codrops demos and CodePens carry their own licences, so note the licence
  before suggesting reuse of any code.
- Prefer components that work with the assumed stack (Next.js 16, React). Flag
  anything Vue/Svelte-only.
- GSAP is free, including the formerly paid plugins (SplitText, MorphSVG, and others).
  Once animation is being built, the `gsap-skills` plugin (enabled in this project)
  covers correct API use.
- Accessibility is part of the critique. A reference that only works with a mouse, or
  that can't honour `prefers-reduced-motion`, is "steal the idea, rebuild the
  behaviour".
- Never invent facts about a site (award, studio, stack). If you don't know, leave it
  out.

## Finish

End with a short summary in chat: the board file you wrote, the strongest 2–3
references, and one or two **open questions** for the owner that the references raise
(e.g. "Two of these lean on WebGL. Do you want 3D at all?"). Don't turn the
findings into a spec or plan. That happens in `superpowers:brainstorming`.
