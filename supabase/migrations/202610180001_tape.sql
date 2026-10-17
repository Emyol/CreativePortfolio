-- The tape's content store. It shares the professional site's Supabase project
-- (free-plan project limit), so every object is tape_-prefixed and nothing of the
-- professional site's (admin_users, portfolio_*, portfolio-assets) is touched.
-- Ported from portfolioV2's 202610120001_portfolio.sql. No service-role key is used.
create table public.tape_admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.tape_admin_users enable row level security;
create policy "Tape owner sees own membership" on public.tape_admin_users for select to authenticated using (user_id = auth.uid());
create function public.is_tape_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.tape_admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_tape_owner() from public;
grant execute on function public.is_tape_owner() to anon, authenticated;

create table public.tape_draft (
  id smallint primary key default 1 check (id = 1),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.tape_published (
  id smallint primary key default 1 check (id = 1),
  content jsonb not null,
  revision bigint not null,
  published_at timestamptz not null default now()
);
create table public.tape_published_assets (name text primary key);
alter table public.tape_draft enable row level security;
alter table public.tape_published enable row level security;
alter table public.tape_published_assets enable row level security;
create policy "Tape owner reads drafts" on public.tape_draft for select to authenticated using (public.is_tape_owner());
create policy "Visitors read the tape" on public.tape_published for select to anon, authenticated using (true);
create policy "Visitors read the tape asset list" on public.tape_published_assets for select to anon, authenticated using (true);
revoke all on public.tape_admin_users, public.tape_draft, public.tape_published, public.tape_published_assets from anon, authenticated;
grant select on public.tape_admin_users, public.tape_draft to authenticated;
grant select on public.tape_published, public.tape_published_assets to anon, authenticated;
revoke insert, update, delete on public.tape_admin_users, public.tape_draft, public.tape_published, public.tape_published_assets from anon, authenticated;

create function public.save_tape_draft(new_content jsonb, expected_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare current_revision bigint;
begin
  if not public.is_tape_owner() then raise exception 'forbidden'; end if;
  if jsonb_typeof(new_content) <> 'object' or octet_length(new_content::text) > 1000000 then raise exception 'invalid_content'; end if;
  perform pg_advisory_xact_lock(716254);
  select revision into current_revision from public.tape_draft where id = 1;
  if coalesce(current_revision, 0) <> expected_revision then raise exception 'revision_conflict'; end if;
  insert into public.tape_draft(id, content, revision) values (1, new_content, expected_revision + 1)
  on conflict (id) do update set content = excluded.content, revision = excluded.revision, updated_at = now();
  return expected_revision + 1;
end;
$$;

-- Archived list entries never reach the publicly readable snapshot or asset allowlist.
create function public.tape_without_archives(value jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare result jsonb;
begin
  if jsonb_typeof(value) = 'array' then
    select coalesce(jsonb_agg(public.tape_without_archives(item) order by ordinal), '[]'::jsonb)
    into result from jsonb_array_elements(value) with ordinality as entry(item, ordinal)
    where coalesce(item->>'archived', 'false') <> 'true';
    return result;
  elsif jsonb_typeof(value) = 'object' then
    select coalesce(jsonb_object_agg(key, public.tape_without_archives(val)), '{}'::jsonb)
    into result from jsonb_each(value) as entry(key, val);
    return result;
  end if;
  return value;
end;
$$;
revoke all on function public.tape_without_archives(jsonb) from public;

create function public.publish_tape(expected_revision bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare draft public.tape_draft; asset text;
begin
  if not public.is_tape_owner() then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(716254);
  select * into draft from public.tape_draft where id = 1 for update;
  if draft.id is null or draft.revision <> expected_revision then raise exception 'revision_conflict'; end if;
  draft.content := public.tape_without_archives(draft.content);
  delete from public.tape_published_assets;
  -- Extract only exact internal media URLs; arbitrary text cannot expose unrelated objects.
  for asset in select distinct substring(v #>> '{}' from '^/api/media/([a-f0-9-]{36}\.(jpg|png|webp))$')
    from jsonb_path_query(draft.content, '$.** ? (@.type() == "string")') v
    where (v #>> '{}') ~ '^/api/media/[a-f0-9-]{36}\.(jpg|png|webp)$'
  loop
    if not exists(select 1 from storage.objects where bucket_id = 'tape-assets' and name = asset) then raise exception 'missing_asset'; end if;
    insert into public.tape_published_assets(name) values(asset) on conflict do nothing;
  end loop;
  insert into public.tape_published(id, content, revision) values(1, draft.content, draft.revision)
  on conflict(id) do update set content = excluded.content, revision = excluded.revision, published_at = now();
end;
$$;
revoke all on function public.save_tape_draft(jsonb, bigint), public.publish_tape(bigint) from public;
grant execute on function public.save_tape_draft(jsonb, bigint), public.publish_tape(bigint) to authenticated;
-- Supabase's default privileges also grant anon; nothing signed out calls these (the owner
-- check inside would refuse anyway). is_tape_owner stays callable: the storage read
-- policy runs it for visitors.
revoke execute on function public.save_tape_draft(jsonb, bigint), public.publish_tape(bigint), public.tape_without_archives(jsonb) from anon;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('tape-assets', 'tape-assets', false, 4194304, array['image/jpeg','image/png','image/webp']);
create policy "Tape owner uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'tape-assets' and public.is_tape_owner());
create policy "Read tape owner or published assets" on storage.objects for select to anon, authenticated
using (bucket_id = 'tape-assets' and (public.is_tape_owner() or exists(select 1 from public.tape_published_assets p where p.name = storage.objects.name)));
-- Immutable filenames preserve old publications. Storage cleanup is a deliberate dashboard operation.

-- The tape has the same single owner as the professional site: copy that verified
-- GitHub identity, so no manual provisioning step is needed.
insert into public.tape_admin_users(user_id) select user_id from public.admin_users on conflict do nothing;
