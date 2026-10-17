# Tape Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Miel edit and publish everything on the tape from `/admin`, with photos uploaded from his phone, backed by the professional site's Supabase project under `tape_` names, deployed on Vercel.

**Architecture:** A ported, renamed copy of portfolioV2's Supabase admin: single-row draft and published records with an optimistic revision check, an atomic publish that also writes a public asset allowlist, a private image bucket, GitHub login and an owner allowlist. The public site reads the published row through a tagged cache and ISR, so a failure keeps the last good render. The editor is explicit per-section configuration checked against `contentSchema`, so it works with an empty seed.

**Tech Stack:** Next.js 16.4 App Router (route handlers, `proxy.ts`, `unstable_cache` + `revalidateTag`), React 19.3, TypeScript, Zod 4, `@supabase/ssr` + `@supabase/supabase-js`, `fflate` (ZIP), Vitest + Testing Library, Playwright. Vercel (Hobby) with one daily cron.

**Spec:** `docs/superpowers/specs/2026-10-17-tape-admin-design.md` (read it first; this plan argues from it). Reference implementation: `../portfolioV2` (`supabase/migrations/202610120001_portfolio.sql`, `lib/supabase/*`, `app/api/admin/*`, `app/api/media/[name]/route.ts`, `app/auth/*`, `proxy.ts`, `app/admin/*`, `docs/admin-setup.md`).

## Global Constraints

- Read `node_modules/next/dist/docs/` before writing Next code (`AGENTS.md`). Cache Components stay off: use `unstable_cache` with tags and route segment `revalidate`, as portfolioV2 does.
- Supabase project `zbdrjutezijwpyfextmj` (shared with the professional site). Every object is `tape_`-prefixed; bucket `tape-assets`. Never read, alter or drop `admin_users`, `portfolio_*`, `portfolio-assets` or their functions.
- No service-role key anywhere. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`, `CRON_SECRET`. `SITE_URL` replaces `NEXT_PUBLIC_SITE_URL` for `metadataBase`.
- Uploads: `image/jpeg`, `image/png`, `image/webp` only, 4 MB max, immutable names `<uuid>.<ext>`, referenced as `/api/media/<uuid>.<ext>`.
- Browser photo step: long edge at most 2400 px, WebP at quality 0.82, orientation from EXIF, records width and height.
- Cache tag `tape-content`; public pages `revalidate = 3600`; publish revalidates the tag and paths `/`, `/tracklist`, `/events/[slug]`.
- Published media: `Cache-Control: public, max-age=31536000, immutable`. Draft media: `private, no-store`, owner only.
- Keep-alive: Vercel Cron `0 3 * * *` on `/api/keepalive`, guarded by `Authorization: Bearer ${CRON_SECRET}`. Vercel functions region `hnd1`.
- Content rules: never invent content; events are events attended; no phone number (reuse the pattern in `lib/rules.test.ts`: `/tel:|\+63|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/`); toolbox only from `PROFESSIONAL_STACK`.
- Admin copy: plain words, no em dashes. Admin UI uses the site's tokens; one column, touch targets at least 44 px, works at 390 px.
- Fixtures stay development-only; `CONTENT_SOURCE=fixtures` also puts the admin in a fake "ready" state for e2e (refused in production like fixtures already are).
- No Claude attribution in commits or PRs.

## Review Focus

1. **Supabase unreachable after a publication** (paused, network): visitors keep the last good tape, never the seed. Pinned in Task 4.
2. **Two devices editing** (phone and laptop): the stale one gets a conflict and a reload, never a silent overwrite, and autosave stops retrying blindly. Pinned in Task 8.
3. **Odd photos** (a 12 MP portrait with EXIF rotation, a HEIC the browser can't decode, one still over 4 MB after shrinking): right way up and small, or a plain message; never a broken upload. Pinned in Task 9.
4. **A draft photo removed before publishing, or an archived entry**: never becomes public; published content still parses. Pinned in Tasks 1 and 3.
5. **An event slug renamed or duplicated**: the editor refuses a duplicate; a newly published slug gets its page without a deploy, an old one 404s. Pinned in Tasks 4 and 7.

---

### Task 1: Database: tape tables, functions, bucket and owner

**Files:**
- Create: `supabase/migrations/202610180001_tape.sql`
- Test: `supabase/verify_tape.sql` (read-only checks, run through the Supabase tool)

**Interfaces:**
- Produces (SQL): tables `public.tape_admin_users(user_id uuid pk)`, `public.tape_draft(id=1, content jsonb, revision bigint, updated_at)`, `public.tape_published(id=1, content jsonb, revision bigint, published_at)`, `public.tape_published_assets(name text pk)`; functions `public.is_tape_owner() returns boolean`, `public.save_tape_draft(new_content jsonb, expected_revision bigint) returns bigint`, `public.publish_tape(expected_revision bigint) returns void`, `public.tape_without_archives(value jsonb) returns jsonb`; private bucket `tape-assets` (4194304 bytes, jpeg/png/webp); storage policies "Tape owner uploads" and "Read tape owner or published assets". Errors raised: `forbidden`, `invalid_content`, `revision_conflict`, `missing_asset`.

- [ ] **Step 1: Write `supabase/verify_tape.sql`**, a single query returning one row of booleans: the four tables exist with RLS on; the four functions exist; bucket `tape-assets` is private with exactly the three image types; `anon` has no select on `tape_draft` (`has_table_privilege('anon','public.tape_draft','select') = false`); `anon` can select `tape_published`; `tape_admin_users` has exactly one row; the professional objects (`admin_users`, `portfolio_draft`, `portfolio_published`, `published_assets`, bucket `portfolio-assets`) still exist unchanged in count.
- [ ] **Step 2: Run it** with `execute_sql` on project `zbdrjutezijwpyfextmj`. Expected: tape checks false (objects missing), professional checks true.
- [ ] **Step 3: Write the migration** by porting portfolioV2's file with every name renamed as above, advisory lock key `716254` (not 716253), asset regex `^/api/media/([a-f0-9-]{36}\.(jpg|png|webp))$`, bucket `tape-assets`, mime types without PDF. End it with the owner seed: `insert into public.tape_admin_users(user_id) select user_id from public.admin_users on conflict do nothing;`.
- [ ] **Step 4: Apply** with `apply_migration` (name `tape_admin`), rerun the verify query (expected: all true), and run `get_advisors` (security): no new findings on `tape_*` objects.
- [ ] **Step 5: Commit** `feat: add the tape's tables, publish functions and photo bucket`.

### Task 2: Supabase clients, request helpers and session proxy

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/http.ts`, `proxy.ts`, `.env.example`
- Modify: `package.json` (add `@supabase/ssr`, `@supabase/supabase-js`, `server-only`, `fflate`, versions as in portfolioV2), `app/layout.tsx` (`metadataBase` from `SITE_URL`)
- Test: `lib/supabase/http.test.ts`, `lib/supabase/server.test.ts`

**Interfaces:**
- Produces: `class AdminError extends Error { status: number }`; `supabaseConfig(): { url: string; key: string } | null`; `publicClient(): SupabaseClient`; `serverClient(): Promise<SupabaseClient>`; `requireOwner(): Promise<SupabaseClient>` (checks `tape_admin_users`); `getAdminStatus(): Promise<{ status: "setup" | "signed-out" | "forbidden" | "ready" | "error"; message?: string }>` (returns `"ready"` when `CONTENT_SOURCE=fixtures` and not production); `sameOrigin(req)`, `json(value, status?)`, `failure(error)`, `readBody(req)` exactly as portfolioV2.

- [ ] **Step 1: Write failing tests.** `http.test.ts`: `sameOrigin` throws 403 for a foreign `origin`; `readBody` rejects non-JSON (415), over 1,000,000 chars (413), bad JSON (400); `failure(new AdminError("x", 409))` gives status 409, body `{ error: "x" }` and `Cache-Control: private, no-store`; an unknown error gives 500 with the generic message. `server.test.ts` (mock `@supabase/ssr`): no env gives status `"setup"`; no user gives `"signed-out"`; a user not in `tape_admin_users` gives `"forbidden"`; fixtures mode in development gives `"ready"`; fixtures mode in production does not.
- [ ] **Step 2: Run** `npx vitest run lib/supabase`. Expected: FAIL (modules missing).
- [ ] **Step 3: Port** the four files from portfolioV2 with the table renamed, messages saying "tape owner", and the fixtures branch in `getAdminStatus`.
- [ ] **Step 4: Run** `npx vitest run lib/supabase && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: connect the tape to Supabase with an owner-only session`.

### Task 3: Content schema for editing

**Files:**
- Modify: `lib/content/schema.ts`
- Test: `lib/content/schema.test.ts`

**Interfaces:**
- Produces: every list item schema (`events`, `music`, `hobbies`, `shelf`, `people`, `links`) accepts optional `archived: boolean`; photo `src` accepts `/api/media/<uuid>.(jpg|png|webp)` explicitly plus any other `/` path; every text field rejects phone-number-like text with "phone numbers stay off the tape"; `export const PHONE = /tel:|\+63|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/`.

- [ ] **Step 1: Write failing tests:** an event with `archived: true` parses; a photo `src` of `/api/media/0b0e5c3c-1f2a-4b3c-9d8e-123456789abc.webp` parses and `https://x/a.jpg` still fails; a person `note` of "call 0917 123 4567" fails with the phone message; `seed.json` and `FIXTURES` still parse.
- [ ] **Step 2: Run** `npx vitest run lib/content`. Expected: FAIL on the new cases.
- [ ] **Step 3: Implement** with a shared `text` refinement and `archived: z.boolean().optional()` on each list item; keep every existing message and limit.
- [ ] **Step 4: Run** `npx vitest run lib/content lib/rules.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: let the tape's content carry archived entries and uploaded photos`.

### Task 4: Reading published content, keeping the last good tape

**Files:**
- Create: `lib/content/repository.ts`
- Modify: `lib/content/load.ts`, `app/page.tsx`, `app/tracklist/page.tsx`, `app/events/[slug]/page.tsx`
- Test: `lib/content/load.test.ts`, `lib/content/repository.test.ts`

**Interfaces:**
- Consumes: `publicClient`, `serverClient`, `requireOwner`, `supabaseConfig` (Task 2).
- Produces: `export const TAPE_TAG = "tape-content"`; `readPublished(): Promise<SiteContent | null>` (cached with `unstable_cache(..., ["tape-published-v1"], { revalidate: 3600, tags: [TAPE_TAG] })`, null when no row); `getDraft(): Promise<{ content: SiteContent; revision: number }>` (fixtures mode returns `FIXTURES` at revision 1); `getContent()` behaviour: fixtures as today; not configured gives seed; configured gives published, or seed when nothing was ever published; configured and failing **throws** (so ISR keeps the previous render) and during `next build` (`process.env.NEXT_PHASE === "phase-production-build"`) throws with "Supabase is unreachable: refusing to build the tape from the seed".
- Pages: `export const revalidate = 3600` on `/`, `/tracklist`, `/events/[slug]`; event pages switch to `dynamicParams = true`, keep `generateStaticParams`, and call `notFound()` for slugs absent from published content.

- [ ] **Step 1: Write failing tests** (mock `@/lib/supabase/server`): published row returned and validated; no row gives seed; not configured gives seed; client error throws (never returns seed); build phase plus error throws the refusal message; archived entries in a published row still parse.
- [ ] **Step 2: Run** `npx vitest run lib/content`. Expected: FAIL.
- [ ] **Step 3: Implement** `repository.ts` and the new `getContent`; set the segment config on the three pages.
- [ ] **Step 4: Run** `npx vitest run lib/content && npm run typecheck && npm run build` (no env: builds from seed). Expected: PASS.
- [ ] **Step 5: Commit** `feat: read the published tape and keep the last good one when Supabase fails`.

### Task 5: Photo storage routes

**Files:**
- Create: `app/api/media/[name]/route.ts`, `app/api/admin/upload/route.ts`
- Modify: `next.config.ts` (`images.localPatterns` allowing `/api/media/**` if `next/image` requires it; read the image docs)
- Test: `app/api/media/route.test.ts`, `app/api/admin/upload/route.test.ts`

**Interfaces:**
- Produces: `GET /api/media/<uuid>.<jpg|png|webp>`: 404 for any other name; published assets streamed with `public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`; unpublished assets owner-only with `private, no-store`. `POST /api/admin/upload` (multipart `file`): same-origin, owner, at most 4 MB, magic-byte check for JPEG/PNG/WebP, returns `{ url: "/api/media/<uuid>.<ext>" }`.

- [ ] **Step 1: Write failing tests** (mock the Supabase clients): bad name gives 404; published name gives 200 with the immutable header; unpublished name for a signed-out request gives 404; upload of a PDF gives 400 "Supported photos: JPEG, PNG and WebP."; a 5 MB file gives 400 "Choose a photo under 4 MB."; a PNG named `.webp` with PNG bytes but `image/webp` type gives 400 "File contents do not match its type."; a valid WebP returns a `/api/media/` URL.
- [ ] **Step 2: Run** `npx vitest run app/api`. Expected: FAIL.
- [ ] **Step 3: Port** both routes from portfolioV2 with the bucket, table and caching changes.
- [ ] **Step 4: Run** `npx vitest run app/api`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: store the tape's photos privately and serve published ones from the CDN`.

### Task 6: Login, logout and the admin shell

**Files:**
- Create: `app/auth/login/route.ts`, `app/auth/callback/route.ts`, `app/auth/logout/route.ts`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/admin.module.css`
- Test: `e2e/admin.spec.ts` (shell states)

**Interfaces:**
- Consumes: `getAdminStatus`, `getDraft`.
- Produces: `/admin` renders by status: `setup` ("Connect Supabase using docs/admin-setup.md."), `signed-out` (a "Sign in with GitHub" button posting to `/auth/login`), `forbidden` ("This GitHub account isn't the tape's owner." plus sign out), `error` (the message), `ready` (`<AdminEditor initialContent initialRevision />` from Task 8). `noindex` metadata. The admin layout does not render the device, dock or power-on.

- [ ] **Step 1: Write the failing e2e** (`e2e/admin.spec.ts`, fixtures server): `/admin` responds 200 with `robots` `noindex` and shows the editor's heading "Edit the tape" (fixtures mode is "ready").
- [ ] **Step 2: Run** `npm run test:e2e -- admin`. Expected: FAIL (404).
- [ ] **Step 3: Port** the auth routes and the admin page; until Task 8 lands, `ready` renders the heading only.
- [ ] **Step 4: Run** the e2e and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add the owner's login and the admin page`.

### Task 7: Save, publish and export

**Files:**
- Create: `app/api/admin/content/route.ts`, `app/api/admin/publish/route.ts`, `app/api/admin/export/route.ts`
- Test: `app/api/admin/content/route.test.ts`, `app/api/admin/publish/route.test.ts`

**Interfaces:**
- Produces: `GET /api/admin/content` gives `{ content, revision }`; `PUT /api/admin/content` with `{ content, revision }` validates with `contentSchema` (400 with the first issue's message and `path`), calls `save_tape_draft`, gives `{ revision }`, or 409 "Saved somewhere else since. Reload to get the latest." on `revision_conflict`; `POST /api/admin/publish` with `{ revision }` calls `publish_tape`, then `revalidateTag(TAPE_TAG, { expire: 0 })` and `revalidatePath` for `/`, `/tracklist` and `/events/[slug]` (`"page"`), gives `{ published: true }`, 409 on conflict, 500 "Couldn't publish: a photo in the draft is missing." on `missing_asset`; `GET /api/admin/export` gives a ZIP (fflate) with `content.json` (`{ draft, published }`) and `assets/<name>` for every object in `tape-assets`, bounded to 64 MB like portfolioV2.

- [ ] **Step 1: Write failing tests** (mock clients and `next/cache`): invalid content gives 400 with `path`; a duplicate event slug gives 400 "duplicate event slug"; conflict gives 409 with the message above; publish success calls `revalidateTag("tape-content", { expire: 0 })` and three `revalidatePath` calls; `missing_asset` gives the message above.
- [ ] **Step 2: Run** `npx vitest run app/api/admin`. Expected: FAIL.
- [ ] **Step 3: Port** the three routes with the renames and messages above.
- [ ] **Step 4: Run** `npx vitest run app/api`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: save drafts, publish the tape and export a backup`.

### Task 8: The editor: sections, rules as you type, autosave

**Files:**
- Create: `lib/admin/sections.ts`, `lib/admin/issues.ts`, `lib/admin/autosave.ts`, `components/admin/AdminEditor.tsx`, `components/admin/Section.tsx`, `components/admin/ListEditor.tsx`, `components/admin/fields.tsx`, `components/admin/StatusBar.tsx`, `components/admin/admin.module.css`
- Modify: `app/admin/page.tsx` (render the editor)
- Test: `lib/admin/sections.test.ts`, `lib/admin/issues.test.ts`, `lib/admin/autosave.test.ts`, `components/admin/AdminEditor.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // lib/admin/sections.ts
  export type FieldKind = "text" | "longtext" | "paragraphs" | "select" | "date" | "slug" | "spotify" | "photo" | "photos" | "toolbox" | "url";
  export type FieldSpec = { key: string; label: string; kind: FieldKind; options?: readonly string[]; hint?: string; optional?: boolean };
  export type SectionSpec = { id: keyof SiteContent; title: string; hint?: string; list: boolean; itemLabel?: (item: any) => string; fields: FieldSpec[]; blank?: () => unknown };
  export const SECTIONS: SectionSpec[]; // order: about, events, music ("mixtape"), people, hobbies ("made"), shelf ("on rotation"), links; toolbox is a field of about
  // lib/admin/issues.ts
  export function issuesByPath(content: unknown): Map<string, string>; // key "events.0.photos.1.alt"
  // lib/admin/autosave.ts
  export type SaveStatus = "saved" | "pending" | "saving" | "offline" | "conflict" | "invalid";
  export function createAutosave(opts: { save: (content: SiteContent, revision: number) => Promise<number>; delay?: number /* 800 */; revision: number }): { change(content: unknown): void; flush(): Promise<void>; status(): SaveStatus; revision(): number; subscribe(l: () => void): () => void };
  ```
  `save` rejects with `{ status: 409 }` on conflict (autosave stops and reports `"conflict"`), with a network error (status `"offline"`, retry with backoff 2 s, 4 s, 8 s, capped at 30 s), and invalid content is never sent (status `"invalid"`).
- Editor behaviour: sections in `SECTIONS` order; lists support add (at the top for events and music, newest first), remove (with an inline "Undo"), move up/down and drag, and an "Archived" switch; each field shows its issue from `issuesByPath` under it, linked by `aria-describedby`; a sticky bar shows the save status, "Preview" (opens `/admin/preview` in a new tab) and "Publish" (disabled with "Fix N things first" while issues exist; confirms inline; shows "Published" after). Events show "Events you went to." under the section title. Slug is suggested from the name (kebab-case) until edited by hand. `toolbox` is a checkbox list of `PROFESSIONAL_STACK`. `shelf.kind` is a select of manga, game, anime.

- [ ] **Step 1: Write failing tests:** `sections.test.ts` asserts every key of `contentSchema.shape` is covered by a section or a field, and every field key exists on its schema object (schema changes break the build of the editor, not the site); `issuesByPath` maps a missing alt to `"events.0.photos.0.alt"` with "every photo needs alt text" and a thirteenth song to `"music"` with "a mixtape holds at most 12 songs"; `autosave.test.ts` (fake timers): two quick changes cause one save after 800 ms, a 409 stops saving with `"conflict"`, a network failure retries at 2 s then 4 s, invalid content sets `"invalid"` and calls nothing; `AdminEditor.test.tsx`: with `FIXTURES`, adding an event and typing a name suggests its slug, clearing an alt shows the message and disables Publish, the status bar reaches "Saved" after a mocked save.
- [ ] **Step 2: Run** `npx vitest run lib/admin components/admin`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules and the components (client components; the editor keeps the content in state and calls `autosave.change` on every edit; `fetch` to Task 7's routes).
- [ ] **Step 4: Run** `npx vitest run lib/admin components/admin && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: edit the whole tape with rules checked as you type and autosave`.

### Task 9: Photos in the editor

**Files:**
- Create: `lib/admin/photo.ts`, `components/admin/PhotoList.tsx`
- Modify: `components/admin/fields.tsx` (use `PhotoList` for `photos`, single-photo variant for `photo`)
- Test: `lib/admin/photo.test.ts`, `components/admin/PhotoList.test.tsx`

**Interfaces:**
- Produces: `fitWithin(width: number, height: number, max = 2400): { width: number; height: number }`; `prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number }>` (decode with `createImageBitmap(file, { imageOrientation: "from-image" })`, draw scaled to a canvas, `toBlob("image/webp", 0.82)`; rejects with `PhotoError("This photo can't be read here. Try a JPEG or PNG.")` when decoding fails and `PhotoError("This photo is still over 4 MB after shrinking.")` when the blob exceeds 4 MB); `uploadPhoto(blob: Blob, onProgress: (fraction: number) => void): Promise<string>` (XHR to `/api/admin/upload` for progress).
- `PhotoList`: `<input type="file" accept="image/*" multiple>` (camera roll on phones); each new photo shows a thumbnail and progress, then joins the list; first is the cover (labelled "Cover"); move earlier/later buttons and drag to reorder; remove; an alt text field per photo, required.

- [ ] **Step 1: Write failing tests:** `fitWithin(4032, 3024)` is `{ width: 2400, height: 1786 }`; `fitWithin(3024, 4032)` is `{ width: 1800, height: 2400 }`; `fitWithin(800, 600)` is unchanged; `prepareImage` with a mocked `createImageBitmap` that throws rejects with the "can't be read" message; with a mocked canvas producing a 5 MB blob rejects with the "still over 4 MB" message; `PhotoList` with mocked `prepareImage`/`uploadPhoto`: choosing two files adds two photos in order with width and height set, the first is labelled "Cover", "Move earlier" on the second makes it the cover, an empty alt shows "every photo needs alt text".
- [ ] **Step 2: Run** `npx vitest run lib/admin/photo.test.ts components/admin/PhotoList.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both.
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add photos from the camera roll, shrunk before upload`.

### Task 10: Spotify fill-in

**Files:**
- Create: `lib/admin/spotify.ts`, `app/api/admin/spotify/route.ts`
- Modify: `components/admin/fields.tsx` (the `spotify` field fills empty title and artist)
- Test: `lib/admin/spotify.test.ts`, `app/api/admin/spotify/route.test.ts`

**Interfaces:**
- Produces: `parseSpotifyMeta(oembed: unknown, html: string): { title?: string; artist?: string }` (title from oEmbed `title`; artist from the track page's `og:description`, the text before the first " · ", only when it is not the title); `GET /api/admin/spotify?url=<track url>` (owner only; rejects non-track URLs with 400; fetches `https://open.spotify.com/oembed?url=` and the track page with a 4 s timeout each; returns `{ title?, artist? }`, `{}` on any upstream failure).
- Field behaviour: on paste or blur of a valid track link, fill title and artist only if they are empty; show "Filled in from Spotify. Check it." for 4 s.

- [ ] **Step 1: Write failing tests:** `parseSpotifyMeta({ title: "lowkey" }, '<meta property="og:description" content="NIKI · Nicole · Song · 2022">')` is `{ title: "lowkey", artist: "NIKI" }`; garbage inputs give `{}`; the route rejects `https://open.spotify.com/album/x` with 400 and returns `{}` when the mocked `fetch` rejects.
- [ ] **Step 2: Run** `npx vitest run lib/admin/spotify.test.ts app/api/admin/spotify`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `feat: fill in a song's title and artist from its Spotify link`.

### Task 11: Preview on the real tape

**Files:**
- Create: `components/tape/TapePage.tsx`, `components/tape/EventPageBody.tsx`, `app/admin/preview/page.tsx`, `app/admin/preview/events/[slug]/page.tsx`
- Modify: `app/page.tsx`, `app/events/[slug]/page.tsx` (render the extracted components)
- Test: `components/tape/TapePage.test.tsx`, `e2e/admin.spec.ts` (preview case)

**Interfaces:**
- Produces: `<TapePage content={SiteContent} eventHref?: (slug) => string />` (the whole home page body: `ActiveTrackProvider`, `HomeTape`, `TapeBody`, `Flip`, `Underside`); `<EventPageBody content event />`. Preview pages are owner-only (`requireOwner`, fixtures in dev), `dynamic = "force-dynamic"`, `noindex`, render the draft through `TapePage` with event links to `/admin/preview/events/<slug>`, and show a fixed "Preview: not published" label.

- [ ] **Step 1: Write failing tests:** `TapePage` with `FIXTURES` renders six track sections and the flip; the e2e opens `/admin/preview` (fixtures server) and sees the device and the "Preview: not published" label, then opens an event link and lands on `/admin/preview/events/fixture-event-6`.
- [ ] **Step 2: Run** `npx vitest run components/tape && npm run test:e2e -- admin`. Expected: FAIL.
- [ ] **Step 3: Extract and implement.** The public pages render exactly as before (their e2e suites must still pass unchanged).
- [ ] **Step 4: Run** `npx vitest run && npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: preview the draft on the real tape`.

### Task 12: Phone-first admin and the full admin e2e

**Files:**
- Modify: `components/admin/admin.module.css`, components from Tasks 8 to 10 as needed
- Test: `e2e/admin.spec.ts`

- [ ] **Step 1: Write failing e2e** (fixtures server, `page.route` stubs for `/api/admin/content`, `/api/admin/upload`, `/api/admin/publish`, `/api/admin/spotify`), on desktop and on an iPhone 13 viewport: add an event, type a name (slug fills), add two photos via `setInputFiles` (small fixture PNGs), give both alt text, see "Saved", publish and see "Published"; a stubbed 409 on save shows "Saved somewhere else since. Reload to get the latest."; at 390 px no horizontal scroll, every button at least 44 px tall, axe has no serious violations.
- [ ] **Step 2: Run** `npm run test:e2e -- admin`. Expected: FAIL on the layout and touch-size checks at least.
- [ ] **Step 3: Style** the admin: one column up to 720 px wide, sticky bottom bar with safe-area padding, large inputs (16 px text so iOS doesn't zoom), the site's tokens and fonts, visible focus.
- [ ] **Step 4: Run** `npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: make the admin work one-handed on a phone`.

### Task 13: Keep-alive, setup guide, deploy and the real-project check

**Files:**
- Create: `app/api/keepalive/route.ts`, `vercel.json`, `docs/admin-setup.md`
- Modify: `CLAUDE.md` (status, decisions: shared Supabase project, admin, keep-alive), `.env.example`
- Test: `app/api/keepalive/route.test.ts`

**Interfaces:**
- Produces: `GET /api/keepalive`: 401 without `Authorization: Bearer ${CRON_SECRET}`; otherwise one `select id from tape_published limit 1` through `publicClient()`, returns `{ ok: true }` (or 503 `{ ok: false }` on failure). `vercel.json`: `{ "regions": ["hnd1"], "crons": [{ "path": "/api/keepalive", "schedule": "0 3 * * *" }] }`.

- [ ] **Step 1: Write failing tests:** no header gives 401; the right header calls Supabase once and gives `{ ok: true }`; a client error gives 503.
- [ ] **Step 2: Run** `npx vitest run app/api/keepalive`. Expected: FAIL.
- [ ] **Step 3: Implement** the route and `vercel.json`; write `docs/admin-setup.md` adapted from portfolioV2's (shared project and `tape_` names, redirect URLs `https://<vercel address>/auth/callback` and `http://localhost:3000/auth/callback`, env vars including a random `CRON_SECRET`, cron, first publish from the seed, backup and restore with the tape's names, the verification checklist, publication is a disclosure, the keep-alive and why it differs from portfolioV2).
- [ ] **Step 4: Deploy.** Create the Vercel project `miel-tape` through the Vercel tools (link the GitHub repo if the connector can; otherwise this is the owner's step), set the env vars (Production and Preview), deploy, and ask the owner to add the callback URL in Supabase → Authentication → URL Configuration. Then run the setup doc's verification checklist against the live deployment: signed-out `/admin` shows sign-in, a signed-out draft photo URL is 404, `/api/keepalive` is 401 without the secret, the home page renders from the seed until the first publish.
- [ ] **Step 5: Commit** `feat: keep the tape's database awake and document setup`, then open the PR per the project `git-operations` skill after `/review-pr` and `experience-reviewer`.
