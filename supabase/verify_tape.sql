-- Read-only checks for the tape's database objects. Run in the SQL editor (or the
-- Supabase tool) after the migration; every column should be true.
select
  (select count(*) = 4 from pg_tables where schemaname = 'public' and rowsecurity
     and tablename in ('tape_admin_users', 'tape_draft', 'tape_published', 'tape_published_assets')) as tables_with_rls,
  (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('is_tape_owner', 'save_tape_draft', 'publish_tape', 'tape_without_archives')) as functions,
  coalesce((select not public and allowed_mime_types = array['image/jpeg','image/png','image/webp'] and file_size_limit = 4194304
     from storage.buckets where id = 'tape-assets'), false) as private_image_bucket,
  coalesce((select not has_table_privilege('anon', 'public.tape_draft', 'select')
     where to_regclass('public.tape_draft') is not null), false) as anon_cannot_read_draft,
  coalesce((select has_table_privilege('anon', 'public.tape_published', 'select')
     where to_regclass('public.tape_published') is not null), false) as anon_reads_published,
  coalesce((select not has_function_privilege('anon', 'public.publish_tape(bigint)', 'execute')
     and not has_function_privilege('anon', 'public.save_tape_draft(jsonb, bigint)', 'execute')
     where to_regprocedure('public.publish_tape(bigint)') is not null), false) as anon_cannot_write,
  case when to_regclass('public.tape_admin_users') is null then false
    else (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.tape_admin_users', false, true, '')))[1]::text::int = 1
  end as one_owner,
  -- Writes only go through the owner-checked functions, never straight into a table.
  (select bool_and(not has_table_privilege(r, 'public.' || t, 'insert, update, delete'))
     from unnest(array['anon', 'authenticated']) r,
          unnest(array['tape_admin_users', 'tape_draft', 'tape_published', 'tape_published_assets']) t
     where to_regclass('public.tape_draft') is not null) as no_direct_writes,
  -- An uploaded photo is never changed or deleted through the API.
  (select not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
     and cmd in ('UPDATE', 'DELETE', 'ALL')
     and (coalesce(qual, '') || coalesce(with_check, '')) like '%tape-assets%')) as photos_cannot_be_changed,
  -- Definer functions pin an empty search_path, so nothing on the caller's path is run.
  (select count(*) = 3 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and 'search_path=""' = any(p.proconfig)
     and p.proname in ('is_tape_owner', 'save_tape_draft', 'publish_tape')) as definers_pin_search_path,
  -- Supabase's API role preloads safeupdate, which refuses a DELETE without WHERE.
  -- These checks run as postgres, where it isn't loaded, so look at the function itself.
  coalesce((select prosrc !~* 'delete\s+from\s+[a-z_.]+\s*;' from pg_proc
     where oid = to_regprocedure('public.publish_tape(bigint)')), false) as publish_survives_safeupdate,
  -- Hidden entries are what publishing strips: one of two events comes back.
  coalesce((select jsonb_array_length(public.tape_without_archives(
       '{"events":[{"name":"kept"},{"name":"hidden","archived":true}],"about":{"letter":[]}}'::jsonb) -> 'events') = 1
     where to_regprocedure('public.tape_without_archives(jsonb)') is not null), false) as hidden_entries_stripped,
  (select count(*) = 4 from pg_tables where schemaname = 'public'
     and tablename in ('admin_users', 'portfolio_draft', 'portfolio_published', 'published_assets')) as professional_tables_intact,
  (select count(*) = 1 from storage.buckets where id = 'portfolio-assets') as professional_bucket_intact;
