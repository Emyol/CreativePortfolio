# Tape admin setup

`/admin` is where the tape is edited and published. The public site works without any of
this (it shows the repo seed, `lib/content/seed.json`); publishing needs the one-time
setup below. No paid plan and no service-role key.

## Where things live

| Piece | Where |
|---|---|
| Database | The professional site's Supabase project (`zbdrjutezijwpyfextmj`, Tokyo), shared because the free plan allows two active projects and both slots are in use. Every tape object is `tape_`-prefixed; nothing of the professional site's is touched. |
| Tables | `tape_admin_users` (owner list), `tape_draft`, `tape_published`, `tape_published_assets` |
| Functions | `is_tape_owner`, `save_tape_draft`, `publish_tape`, `tape_without_archives` |
| Photos | Private bucket `tape-assets` (JPEG, PNG, WebP, 4 MB each) |
| Schema | `supabase/migrations/202610180001_tape.sql`; check it with `supabase/verify_tape.sql` (every column true) |
| Site | Vercel project `miel-tape`, functions in Tokyo (`hnd1`) next to the database |

If a project slot is freed later, the same migration runs unchanged in a project of its
own; only the environment variables change.

## One-time setup

1. **Database.** Already applied to the shared project (2026-10-18). For a fresh project,
   run `supabase/migrations/202610180001_tape.sql` once in the SQL editor, then
   `supabase/verify_tape.sql`.
2. **Owner.** The migration copies the professional site's verified owner (the single row
   in `admin_users`) into `tape_admin_users`. In a fresh project, sign in at `/admin` once,
   copy your GitHub user's UUID from Authentication > Users, then run
   `insert into public.tape_admin_users(user_id) values ('YOUR-UUID');`.
3. **Login redirect.** GitHub sign-in is already set up in the shared project. In
   Supabase > Authentication > URL Configuration > Redirect URLs, add exactly:
   - `https://miel-tape.vercel.app/auth/callback` (or the site's real address)
   - `http://localhost:3000/auth/callback` (probably there already, for the professional site)

   Leave the Site URL as the professional site's. Avoid wildcard redirects.
4. **Environment** (copy `.env.example` to `.env.local` locally; the same names in Vercel,
   Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key (never service_role)
   - `SITE_URL`: `http://localhost:3000` locally; on Vercel, `https://miel-tape.vercel.app` for **Production only**. Leave it unset for Preview, so each preview checks requests against its own address (a production value there would refuse every save from the preview URL).
   - `CRON_SECRET`: a long random string (Vercel sends it to the keep-alive)

   Redeploy after changing them.
5. **First publish.** Open `/admin`, sign in, check the draft (it starts from the seed),
   preview it, publish.

## Editing

- **Autosave.** Changes save a moment after typing stops. A draft may be unfinished; a
  second tab or device with an older copy gets "Saved somewhere else since. Reload to get
  the latest." instead of overwriting.
- **Rules as you type.** Every field shows the tape's own rule (a photo needs a
  description, a mixtape holds 12 songs, a Spotify link must be a song). Publish stays off
  until nothing is wrong, and publishing checks the saved draft again on the server.
- **Photos.** Picked from the camera roll, shrunk in the browser to 2400 px on the long
  side (WebP, or JPEG on older Safari) before upload. Each gets an immutable random name.
  Only photos referenced by the published tape are readable without signing in; draft
  photos are a 404 for everyone else, even if the address is guessed.
- **Archived.** "Hide from the tape" keeps an entry in the draft but strips it at publish.
- **Preview.** `/admin/preview` is the real tape with the draft, owner-only.

Publishing is a disclosure: a published photo is cached by the CDN for a year (names are
never reused), so unpublishing doesn't recall copies already fetched. Avoid sensitive
photos.

## Keeping the database awake

Supabase pauses free projects after a week without activity, and uploaded photos need it
up. Vercel Cron calls `/api/keepalive` once a day at 03:00 UTC (`vercel.json`; Hobby's
limit is daily), which makes one read. This differs from the professional site, which
chose no keep-alive; because the project is shared, it now keeps both awake. If the cron
ever stops, the public pages keep serving the last good tape (they are cached and rebuilt
from Supabase only when it answers); resume a paused project in the Supabase dashboard.

## Backup and restore

`/admin` > Export downloads `tape-backup.zip`: `content.json` (draft and publication) and
`assets/` with every uploaded photo, drafts included. It is bounded to 64 MB; beyond that,
download the `tape-assets` bucket from the Storage dashboard and export `tape_draft` and
`tape_published` from the table editor.

To restore into a project with the migration applied and the owner provisioned:

1. Upload every file in `assets/` to `tape-assets` under its original name.
2. In the SQL editor, as the owner, save the backup's published content and publish it:

```sql
begin;
select set_config('request.jwt.claim.sub', 'YOUR-OWNER-UUID', true);
select public.save_tape_draft($backup$ PASTE_PUBLISHED_CONTENT_OBJECT $backup$::jsonb, 0);
select public.publish_tape(1);
commit;
```

3. If the backup also has an unpublished draft, run `save_tape_draft` again with
   `draft.content` and expected revision 1, without publishing. Never run this over a
   project with a newer tape without exporting it first.

## Checks before relying on it

- Signed out, `/admin` offers sign-in, and `/api/admin/content` refuses.
- A freshly uploaded photo's `/api/media/...` address is a 404 when signed out, and
  readable after publishing.
- A second tab with an older draft gets the conflict message on save.
- `/api/keepalive` is 401 without the secret.
- Export opens and contains `content.json` and the photos.
