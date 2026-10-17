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
  (select count(*) = 4 from pg_tables where schemaname = 'public'
     and tablename in ('admin_users', 'portfolio_draft', 'portfolio_published', 'published_assets')) as professional_tables_intact,
  (select count(*) = 1 from storage.buckets where id = 'portfolio-assets') as professional_bucket_intact;
