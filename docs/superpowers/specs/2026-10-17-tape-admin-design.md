# Tape admin: content store, photos and the editor

Status: approved by the owner on 2026-10-18.
Follows: `2026-10-17-side-a-design.md` (the public site, built and merged). This replaces
the two planned specs ("content model" then "admin port") with one: with the public site
done they are one piece of work. CLAUDE.md's decomposition row changes accordingly.

## Intent

Miel wants to edit the tape himself, any time, the way he edits his professional site:
an admin page where he changes content and publishes it, with no deploy and no one else
in the loop. Today every word and photo has to reach `lib/content/seed.json` through
`content-inbox/` and a commit, so the live tape is an empty device with two links.

Success looks like this: Miel gets home from an event, opens `/admin` on his phone, adds
the event with a few photos straight from his camera roll, previews it on the real tape,
publishes, and it is live a moment later. Nothing he does there can break the site or
leak a draft.

What the owner decided, which this spec preserves:

- **Same system as the professional site** (portfolioV2): an admin page with drafts,
  preview and publish, backed by Supabase. Port it; don't invent a new one.
- **Photos are uploaded in the admin** ("some other way" was acceptable only if it was as
  convenient; uploading from the admin is the convenient way), made sturdy:
  photos shrink in the browser before upload, a scheduled job keeps the free Supabase
  project from pausing, and the ZIP export backs everything up.
- **Hosting: Vercel**, on a free `*.vercel.app` address until a domain is chosen.
- **Five improvements over the professional admin**, all wanted:
  1. phone-friendly editing, with several photos picked at once, a chosen cover and
     drag to reorder;
  2. the preview is the real tape (device, dock, flip, event pages) showing the draft;
  3. a pasted Spotify link fills in the song's title, and the artist when Spotify's
     public page gives it, always editable;
  4. the site's own content rules are checked as he types, not only at publish;
  5. the draft autosaves.
- Only Miel ever logs in.

## Goals

- Miel edits every part of the tape (liner notes and candid, events with photos, the
  mixtape, people, made, on rotation, the toolbox, the footer links) from `/admin` and
  publishes without a deploy.
- Visitors only ever see published content; drafts and draft photos stay private.
- The public site keeps working, and keeps showing the last good publication, when
  Supabase is slow, paused or down.
- Photos load fast for visitors and stay within free-plan bandwidth.

## Non-goals

- Multiple editors, roles or comments. One owner.
- Scheduling, version history beyond draft/published, or undo beyond the draft.
- Editing the device art, copy that is UI (key labels, screen text) or the layout.
- A paid plan anywhere.

## Anti-goals (would make this a failure even if it works)

- A visitor ever sees an empty tape because Supabase was asleep.
- A draft, a draft photo or an unpublished event is reachable without logging in.
- Editing on a phone is so fiddly that Miel goes back to sending files.
- The admin lets him publish something the site then refuses to render (a broken
  Spotify link, a photo without a description, a thirteenth song).
- A service-role key, or any secret, in the browser or the repo.

## Constraints

- Next.js 16.4 with breaking changes: read `node_modules/next/dist/docs/` for caching
  (`unstable_cache` / `revalidateTag` / route segment config), route handlers, `proxy.ts`
  and cron before writing code.
- The content contract is `lib/content/schema.ts` (Zod 4). It already defines every field,
  limit and rule the site renders with. The admin and the database store exactly this
  shape; there is no second model.
- Supabase Free and Vercel Hobby limits apply (check current terms at build time). Vercel
  Hobby cron runs at most once a day.
- The site's content rules (CLAUDE.md): never invent content, events are events attended,
  no phone number anywhere, toolbox limited to `PROFESSIONAL_STACK`.
- Accessibility carries over to the admin: labelled controls, keyboard operable, visible
  focus, errors announced.

## How it works

### Supabase project

**Shared with the professional site, isolated by name** (decided 2026-10-18). Creating
its own project failed: the owner's account is at Supabase's limit of two active free
projects, and freeing one would mean pausing or deleting a project, which only the owner
can choose. So the tape lives in the professional site's existing free project
(`zbdrjutezijwpyfextmj`, Tokyo), with nothing shared but the database server and the
GitHub login provider. CLAUDE.md's "own project" requirement existed because the
migration is single-document with fixed names; prefixing every name removes the clash.

Port `supabase/migrations/202610120001_portfolio.sql` from portfolioV2 as this repo's
first migration, renamed and changed:

- tables `tape_admin_users`, `tape_draft`, `tape_published`, `tape_published_assets`;
  functions `is_tape_owner`, `save_tape_draft`, `publish_tape`, `tape_without_archives`;
  a separate advisory-lock key; bucket `tape-assets`. Nothing of the professional site's
  (`admin_users`, `portfolio_*`, `portfolio-assets`) is read, altered or dropped;
- the tape's owner list is its own table, seeded with the owner's already verified
  GitHub user id (the single row in `admin_users`), so no owner step is needed;
- uploads are images only: JPEG, PNG and WebP (no PDF), still 4 MB per file at most; the
  asset pattern in `publish_tape` and the media route drops `pdf`;
- everything else stays: single-row draft and published records, the optimistic revision
  check, atomic publish that writes the published asset allowlist, archived entries
  stripped at publish, a private bucket, RLS everywhere, no service-role key used by the
  app.

If the owner later frees a project slot, the same migration runs unchanged in a project
of its own; only the env vars change.

Login is GitHub OAuth through Supabase, exactly as portfolioV2 (`app/auth/*`,
`proxy.ts`, `lib/supabase/{server,http}.ts`). The provider is already configured in the
shared project; the tape only needs its callback URLs added to the allowed redirect list
(an owner dashboard step, since the tools cannot change auth settings).

### How the public site reads content

`lib/content/load.ts`'s `getContent()` keeps its signature and its fixtures path. In
production it reads the published row, validates it with `contentSchema`, and caches it
under a tag that publishing revalidates, so a publish is live within seconds.

Falling back must never mean the empty seed once anything has been published:

- Pages are statically rendered and revalidated (ISR). A failed revalidation keeps
  serving the previous render, so a paused or failing Supabase shows the last good
  publication, not the seed.
- With Supabase not configured (local dev, CI, preview builds without env), content is
  the repo seed, as today.
- A **production** build with Supabase configured but unreachable fails loudly rather
  than shipping the seed over a published tape. (Builder: confirm this is achievable
  with Next 16's build-time data fetching; if a hard fail is not possible, the build
  must at least log it and the deploy must not replace a good publication with seed.)

Event pages today are generated only at build time (`dynamicParams = false`). An event
published from the admin must get its page without a deploy: allow on-demand
generation for slugs that exist in the published content and keep 404 for the rest.

### Photos

- **Uploaded in the admin.** The browser decodes the chosen photo, corrects its
  orientation, scales it so the long edge is at most 2400 px, and encodes it as WebP at
  about 0.82 quality before upload (typically a few hundred KB). The same step records its
  width and height, which the schema already requires. A photo that is still over 4 MB
  after that is refused with a plain message.
- **Stored** in the private bucket under an immutable random name, referenced from
  content as `/api/media/<uuid>.webp` (passes the schema's "path under public/"-style check,
  which accepts any `/` path; keep that check, and teach it the `/api/media/` form
  explicitly).
- **Served** by the ported media route. Published photos are served with long-lived,
  immutable caching so Vercel's CDN and `next/image` cache them and Supabase is hit once
  per photo, not once per view. Draft photos stay `private, no-store` and owner-only.
  Unpublishing does not recall copies already cached; the setup doc says publication is
  a disclosure (as portfolioV2's does).
- **Kept awake.** A Vercel Cron job runs once a day and makes one cheap read from Supabase
  (the published row), so the project never counts as inactive. The route checks Vercel's
  `CRON_SECRET` and does nothing else. This deliberately differs from portfolioV2, which
  chose no keep-alive; record that in the setup doc.
- **Backed up** by the ported ZIP export (content plus every uploaded file).

Static photos under `public/` still work (the schema accepts any `/` path), so anything
already in the repo or supplied through `content-inbox/` keeps rendering.

### The admin

At `/admin`, owner-only, ported from portfolioV2 (`app/admin/*`, `app/api/admin/*`,
`app/api/media/[name]`), rebuilt where this site needs it:

- **Fields come from `contentSchema`, not from the seed.** portfolioV2 derives its editor
  from the first item of each list in `seed.json`; this seed's lists are empty, so that
  would show nothing. Drive the editor from the Zod schema (and a small map of per-field
  presentation: which strings are long text, which are photos, which are selects).
- **Sections in tape order**, named as on the tape: about (liner notes, candid photo),
  events, mixtape, people, made, on rotation, then toolbox and links. Each list supports
  add, remove, reorder and an "archived" switch that hides an entry from the tape without
  deleting it (portfolioV2 already strips archived entries at publish; the schema gains an
  optional `archived` flag the public site never sees).
- **Purpose-built fields** where the generic ones would be clumsy:
  - photo lists: pick several at once (camera roll on a phone), each uploads with
    progress, drag or move to reorder, the first is the cover, alt text required;
  - Spotify song: paste a link, title (and artist when available) fills in;
  - event slug: suggested from the name, editable, kept unique;
  - dates: the schema's `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, with a date picker for the
    common case;
  - shelf kind: manga, game or anime;
  - toolbox: chosen from `PROFESSIONAL_STACK` only.
- **Rules as you type.** Every change is validated with `contentSchema` and shown next to
  the field, in the site's words ("an event needs at least one photo", "a mixtape holds
  at most 12 songs", "spotify must be an open.spotify.com track link"). Publish is
  disabled, with the reason, while anything is invalid. The admin also refuses text that
  looks like a phone number (the content rule), reusing the pattern in
  `lib/rules.test.ts`. Events carry a one-line reminder that they are events attended.
- **Autosave.** Changes save to the draft a moment after typing stops, with the existing
  revision check. A second tab or device with a stale draft gets a clear conflict and a
  way to reload, never a silent overwrite. The status ("saved", "saving", "offline, will
  retry") is always visible.
- **Preview is the tape.** `/admin/preview` renders the real home page (device, dock,
  flip, mixtape) and the event pages from the draft, owner-only, never cached.
- **Phone first.** One column, large touch targets, sticky save/preview/publish bar,
  works one-handed at 390 px wide. Desktop gets the same editor with more room.
- **Spotify fill-in** is a small owner-only route that fetches Spotify's public oEmbed
  for the title and, best effort, the track page's metadata for the artist. If Spotify
  changes or refuses, the fields stay empty for typing; nothing breaks.

### Setup and environment

`.env.example` gains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SITE_URL` (also used for `metadataBase`, replacing `NEXT_PUBLIC_SITE_URL`) and
`CRON_SECRET`. Never a service-role key. A `docs/admin-setup.md` adapted from
portfolioV2's covers: create the project, run the migration, GitHub OAuth, redirect URLs
for the `*.vercel.app` address and localhost, Vercel env vars and cron, provisioning the
owner UUID, first publish from the seed, backup and restore, and the verification
checklist (signed-out access refused, draft photo 404 until published, stale-tab conflict,
export contents).

Account setup (decided by the owner on 2026-10-18): the builder sets things up through
the connected Supabase and Vercel tools. Supabase: the shared project above. Vercel: a
project named `miel-tape` (address `miel-tape.vercel.app` if free), functions in Tokyo
(`hnd1`) next to the database. The owner's only steps are adding the tape's callback URLs
in Supabase and, if the connector cannot, linking the GitHub repo in Vercel.

## Tests

- Unit: content loading (published, not configured, unreachable), the schema additions
  (`archived`, `/api/media/` paths), the browser photo step (dimensions, orientation,
  size cap) where it can run in jsdom, autosave and conflict handling, the Spotify fill-in
  parsing, the editor's validation messages.
- E2E (Playwright, no real Supabase): the admin with a stubbed backend (route
  interception), on desktop and at 390 px: add an event with photos, see errors, preview,
  publish; signed-out `/admin` shows login; the public site unchanged against fixtures.
- Real-project checks from the setup doc's verification list, run once against the new
  project before live use.

## Left to the builder

- How the editor is generated from the Zod schema, and how much of `AdminEditor.tsx`
  survives.
- Exact cache lifetimes and revalidation wiring, within the behaviour above.
- The photo pipeline's library, if any (`pick-ui-library` before adding a dependency).
- Admin visual design: plain and fast, in the site's tokens; it is a tool, not part of
  the tape.
- Commit and PR breakdown.

## Calls I made (owner to check)

- One spec for store plus admin, not two.
- Long edge 2400 px, WebP, before upload.
- Published photos cached long and immutable at the CDN; drafts private.
- A daily keep-alive via Vercel Cron (Hobby's limit), unlike portfolioV2; it now keeps both sites' shared project awake.
- The tape shares the professional site's Supabase project under `tape_` names (free-plan limit).
- The site keeps serving the last good publication when Supabase is down; a production
  build refuses to replace a publication with the seed.
- Event pages generated on demand for newly published events.
- An "archived" switch per entry, carried over from portfolioV2.
- The admin blocks text that looks like a phone number.
