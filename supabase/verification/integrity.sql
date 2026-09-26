-- Deferred publication invariant checks after `npm run db:reset:local`.
-- Positive and negative integrity probes run transactionally and are rolled back.

begin;

do $$
declare
  actual_tables text[];
  expected_tables constant text[] := array[
    'assistant_knowledge', 'assistant_logs',
    'attribute_group_translations', 'attribute_groups',
    'attribute_option_translations', 'attribute_options',
    'attribute_translations', 'attributes', 'categories',
    'category_attributes', 'category_slug_routes', 'category_translations',
    'lead_delivery_attempts', 'lead_status_history',
    'lead_telegram_deliveries', 'leads',
    'product_attribute_value_translations', 'product_attribute_values',
    'product_image_translations', 'product_images', 'product_slug_routes',
    'product_translations', 'product_views', 'products', 'profiles', 'site_settings', 'user_roles'
  ];
begin
  select array_agg(table_name order by table_name) into actual_tables
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE';
  if actual_tables is distinct from expected_tables then
    raise exception 'public table inventory mismatch: %', actual_tables;
  end if;

  if (
    select count(*)
    from pg_constraint as constraint_row
    join pg_class as relation on relation.oid = constraint_row.conrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and constraint_row.contype = 'p'
  ) <> cardinality(expected_tables) then
    raise exception 'primary key inventory mismatch';
  end if;
  if exists (
    select 1
    from unnest(expected_tables) as expected(table_name)
    where not exists (
      select 1
      from pg_constraint as constraint_row
      join pg_class as relation on relation.oid = constraint_row.conrelid
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = expected.table_name
        and constraint_row.contype = 'p'
    )
  ) then
    raise exception 'a public table is missing its primary key';
  end if;

  if exists (
    with expected(name) as (values
      ('attribute_group_translations_group_id_fkey'),
      ('attribute_option_translations_option_id_fkey'),
      ('attribute_options_attribute_id_fkey'),
      ('attribute_translations_attribute_id_fkey'),
      ('attributes_group_id_fkey'),
      ('categories_parent_id_fkey'),
      ('category_attributes_attribute_id_fkey'),
      ('category_attributes_category_id_fkey'),
      ('category_slug_routes_category_id_fkey'),
      ('category_translations_category_id_fkey'),
      ('lead_delivery_attempts_delivery_id_fkey'),
      ('lead_status_history_changed_by_fkey'),
      ('lead_status_history_lead_id_fkey'),
      ('lead_telegram_deliveries_lead_id_fkey'),
      ('leads_product_id_fkey'),
      ('product_attribute_value_translations_value_id_fkey'),
      ('product_attribute_values_attribute_id_fkey'),
      ('product_attribute_values_option_id_attribute_id_fkey'),
      ('product_attribute_values_product_id_fkey'),
      ('product_image_translations_image_id_fkey'),
      ('product_images_product_id_fkey'),
      ('product_slug_routes_product_id_fkey'),
      ('product_translations_product_id_fkey'),
      ('product_views_product_id_fkey'),
      ('products_category_id_fkey'),
      ('profiles_id_fkey'),
      ('user_roles_user_id_fkey')
    ), actual(name) as (
      select constraint_row.conname
      from pg_constraint as constraint_row
      join pg_class as relation on relation.oid = constraint_row.conrelid
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and constraint_row.contype = 'f'
    )
    (select name from expected except select name from actual)
    union all
    (select name from actual except select name from expected)
  ) then
    raise exception 'foreign key inventory mismatch';
  end if;

  if exists (
    select 1 from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public' and relation.relkind = 'r'
      and not relation.relrowsecurity
  ) then
    raise exception 'RLS is disabled on a public table';
  end if;

  -- Every public table is admin-reachable through `admin_all`, except the
  -- append-only `product_views` counter: it is written by a security definer
  -- RPC and admins only read it, so it carries a named select-only policy.
  if exists (
    select 1
    from unnest(expected_tables) as expected(table_name)
    where expected.table_name <> 'product_views'
      and not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = expected.table_name
          and policyname = 'admin_all'
      )
  ) or (
    select count(*) from pg_policies
    where schemaname = 'public' and policyname = 'admin_all'
  ) <> cardinality(expected_tables) - 1 or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_views'
      and policyname = 'Admins can view product views' and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
  ) then
    raise exception 'admin policy inventory mismatch';
  end if;
  if (
    select count(*) from pg_policies where schemaname = 'public'
  ) <> 47 then
    raise exception 'public policy inventory mismatch';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and 'anon' = any(roles)
      and cmd <> 'SELECT'
  ) then
    raise exception 'anon has a non-select public policy';
  end if;

  if not has_function_privilege(
    'authenticated', 'private.is_admin()', 'execute'
  ) or has_function_privilege('anon', 'private.is_admin()', 'execute') then
    raise exception 'private.is_admin function grants mismatch';
  end if;

  if exists (
    select 1
    from pg_default_acl as defaults
    left join pg_namespace as namespace on namespace.oid = defaults.defaclnamespace
    cross join lateral aclexplode(defaults.defaclacl) as privilege
    where defaults.defaclrole = (select oid from pg_roles where rolname = 'postgres')
      and (
        (namespace.nspname = 'public' and defaults.defaclobjtype in ('r', 'S', 'f'))
        or (defaults.defaclnamespace = 0 and defaults.defaclobjtype = 'f')
      )
      and privilege.grantee in (
        0,
        (select oid from pg_roles where rolname = 'anon'),
        (select oid from pg_roles where rolname = 'authenticated'),
        (select oid from pg_roles where rolname = 'service_role')
      )
  ) then
    raise exception 'unsafe future-object default privilege remains';
  end if;
  if (
    select count(*)
    from pg_default_acl as defaults
    left join pg_namespace as namespace on namespace.oid = defaults.defaclnamespace
    where defaults.defaclrole = (select oid from pg_roles where rolname = 'postgres')
      and (
        (namespace.nspname = 'public' and defaults.defaclobjtype in ('r', 'S'))
        or (defaults.defaclnamespace = 0 and defaults.defaclobjtype = 'f')
      )
  ) <> 3 then
    raise exception 'default privilege inventory mismatch';
  end if;

  if exists (
    select 1
    from unnest(array[
      'categories_parent_fk_idx', 'products_category_fk_idx',
      'category_attributes_attribute_fk_idx',
      'product_attribute_values_attribute_fk_idx',
      'category_slug_routes_entity_idx', 'product_slug_routes_entity_idx',
      'leads_product_created_idx', 'lead_status_history_lead_created_idx',
      'lead_delivery_attempts_delivery_started_idx',
      'product_attribute_values_option_fk_idx',
      'lead_status_history_changed_by_fk_idx',
      'leads_source_locale_created_idx'
    ]) as expected(index_name)
    where not exists (
      select 1 from pg_class as index_relation
      join pg_namespace as namespace on namespace.oid = index_relation.relnamespace
      join pg_index as index_row on index_row.indexrelid = index_relation.oid
      where namespace.nspname = 'public'
        and index_relation.relname = expected.index_name
        and index_row.indisvalid
    )
  ) then
    raise exception 'required foreign-key index is missing';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'product-images' and name = 'product-images' and public
      and file_size_limit = 5242880
      and allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp', 'image/avif'
      ]::text[]
  ) then
    raise exception 'product-images bucket configuration mismatch';
  end if;
  if (
    select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'product_images_admin_select', 'product_images_admin_insert',
        'product_images_admin_delete'
      )
  ) <> 3 then
    raise exception 'Storage policy inventory mismatch';
  end if;

  -- Seed size changes with the catalog, so the backfill is checked
  -- structurally: one current route per translated locale, nothing stale.
  if (select count(*) from public.category_slug_routes)
      <> (select count(*) from public.category_translations)
    or (select count(*) from public.product_slug_routes)
      <> (select count(*) from public.product_translations)
    or exists (
      select 1 from public.category_slug_routes where not is_current
    )
    or exists (
      select 1 from public.product_slug_routes where not is_current
    )
  then
    raise exception 'initial slug route backfill mismatch';
  end if;

  if not has_function_privilege(
    'anon',
    'public.search_public_catalog_product_ids(public.app_locale,uuid,text,text,public.availability_status,bigint,bigint,jsonb,text,integer,integer)',
    'execute'
  ) or not has_function_privilege(
    'anon',
    'public.get_public_catalog_facets(public.app_locale,uuid)',
    'execute'
  ) or has_function_privilege(
    'anon', 'private.sync_product_slug_route()', 'execute'
  ) or has_function_privilege(
    'authenticated', 'private.sync_category_slug_route()', 'execute'
  ) then
    raise exception 'Stage 4 function grants mismatch';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.submit_public_lead(uuid,text,text,text,public.app_locale,public.lead_source,text,text,text,text,text,uuid,text)',
    'execute'
  ) or not has_function_privilege(
    'service_role', 'public.claim_lead_telegram_delivery(uuid)', 'execute'
  ) or not has_function_privilege(
    'service_role',
    'public.complete_lead_telegram_delivery(uuid,uuid,public.lead_delivery_outcome,text,integer,integer,text,integer)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.submit_public_lead(uuid,text,text,text,public.app_locale,public.lead_source,text,text,text,text,text,uuid,text)',
    'execute'
  ) or has_function_privilege(
    'authenticated', 'public.claim_lead_telegram_delivery(uuid)', 'execute'
  ) then
    raise exception 'Stage 5 function grants mismatch';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.admin_save_category(uuid,uuid,text,integer,boolean,jsonb,jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.admin_save_product(uuid,uuid,text,text,text,bigint,bigint,public.availability_status,integer,boolean,boolean,integer,jsonb,jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.admin_create_product_image(uuid,text,text,text,integer,boolean)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.admin_set_lead_status(uuid,public.lead_status)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.admin_set_public_site_setting_pair(text,text,text)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.admin_save_category(uuid,uuid,text,integer,boolean,jsonb,jsonb)',
    'execute'
  ) or has_function_privilege(
    'service_role',
    'public.admin_set_lead_status(uuid,public.lead_status)',
    'execute'
  ) then
    raise exception 'Stage 6 function grants mismatch';
  end if;

  -- 24 admin RPCs, one signature each. An accidental overload is an error in
  -- itself: PostgREST resolves overloads by argument names, so a leftover
  -- signature stays callable with the grants of the version it replaced.
  if (
    select count(*)
    from pg_proc as function_row
    join pg_namespace as namespace on namespace.oid = function_row.pronamespace
    where namespace.nspname = 'public'
      and function_row.proname like 'admin\_%' escape '\'
  ) <> 24 or (
    select count(distinct function_row.proname)
    from pg_proc as function_row
    join pg_namespace as namespace on namespace.oid = function_row.pronamespace
    where namespace.nspname = 'public'
      and function_row.proname like 'admin\_%' escape '\'
  ) <> 24 then
    raise exception 'Stage 6 admin RPC inventory mismatch';
  end if;
  if exists (
    select 1
    from pg_proc as function_row
    join pg_namespace as namespace on namespace.oid = function_row.pronamespace
    where namespace.nspname = 'public'
      and function_row.proname like 'admin\_%' escape '\'
      and (
        not has_function_privilege('authenticated', function_row.oid, 'execute')
        or has_function_privilege('anon', function_row.oid, 'execute')
        or has_function_privilege('service_role', function_row.oid, 'execute')
        or exists (
          select 1
          from aclexplode(
            coalesce(
              function_row.proacl,
              acldefault('f', function_row.proowner)
            )
          ) as privilege
          where privilege.grantee = 0
            and privilege.privilege_type = 'EXECUTE'
        )
      )
  ) then
    raise exception 'Stage 6 admin RPC privilege inventory mismatch';
  end if;

  if has_table_privilege('authenticated', 'public.site_settings', 'insert')
    or has_table_privilege('authenticated', 'public.site_settings', 'delete')
    or has_table_privilege('authenticated', 'public.site_settings', 'update')
    or not has_column_privilege(
      'authenticated', 'public.site_settings', 'value', 'update'
    )
    or has_column_privilege(
      'authenticated', 'public.site_settings', 'key', 'update'
    )
    or has_column_privilege(
      'authenticated', 'public.site_settings', 'locale', 'update'
    )
  then
    raise exception 'Stage 6 site settings grants mismatch';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_images'
      and column_name = 'deletion_pending_at'
  ) then
    raise exception 'product image deletion marker is missing';
  end if;
end;
$$;

create function private.default_acl_probe()
returns void
language sql
set search_path = ''
as 'select null::void';

do $$
begin
  if has_function_privilege('anon', 'private.default_acl_probe()', 'execute')
    or has_function_privilege(
      'authenticated', 'private.default_acl_probe()', 'execute'
    )
    or has_function_privilege(
      'service_role', 'private.default_acl_probe()', 'execute'
    )
  then
    raise exception 'future private functions inherit execute privileges';
  end if;
end;
$$;

drop function private.default_acl_probe();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_roles', 'categories', 'category_translations',
    'products', 'product_translations', 'product_images',
    'product_image_translations', 'attribute_groups',
    'attribute_group_translations', 'attributes', 'attribute_translations',
    'attribute_options', 'attribute_option_translations',
    'category_attributes', 'product_attribute_values',
    'product_attribute_value_translations', 'site_settings',
    'category_slug_routes', 'product_slug_routes', 'leads',
    'lead_status_history', 'lead_telegram_deliveries',
    'lead_delivery_attempts'
  ] loop
    if not has_table_privilege('service_role', format('public.%I', table_name), 'select')
      or not has_table_privilege('service_role', format('public.%I', table_name), 'insert')
      or not has_table_privilege('service_role', format('public.%I', table_name), 'update')
      or not has_table_privilege('service_role', format('public.%I', table_name), 'delete')
      or has_table_privilege('service_role', format('public.%I', table_name), 'truncate')
      or has_table_privilege('anon', format('public.%I', table_name), 'truncate')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'truncate')
    then
      raise exception 'table grants mismatch for %', table_name;
    end if;
  end loop;
end;
$$;

do $$
declare
  created_lead_id uuid;
  repeated_lead_id uuid;
  created boolean;
  delivery_attempt_id uuid;
  delivery_lease_token uuid;
begin
  select lead_id, was_created into created_lead_id, created
  from public.submit_public_lead(
    '93000000-0000-4000-8000-000000000001',
    repeat('a', 64), repeat('b', 64), repeat('c', 64),
    'ru', 'product_page', '/ru/product/verification',
    'Проверочный клиент', '+37369111111', '@verification_user',
    'Проверка этапа 5',
    '20000000-0000-4000-8000-000000000001', 'stage-5-v1'
  );
  if not created then
    raise exception 'first lead submission was not marked as created';
  end if;

  select lead_id, was_created into repeated_lead_id, created
  from public.submit_public_lead(
    '93000000-0000-4000-8000-000000000001',
    repeat('a', 64), repeat('b', 64), repeat('c', 64),
    'ru', 'product_page', '/ru/product/verification',
    'Проверочный клиент', '+37369111111', '@verification_user',
    'Проверка этапа 5',
    '20000000-0000-4000-8000-000000000001', 'stage-5-v1'
  );
  if created or repeated_lead_id <> created_lead_id then
    raise exception 'idempotent lead submission created a duplicate';
  end if;

  if not exists (
    select 1 from public.leads
    where id = created_lead_id and status = 'new'
      and product_name_snapshot is not null
      and product_price_minor is not null
      and product_currency = 'MDL'
      and product_path_snapshot like '/ru/product/%'
  ) or (
    select count(*) from public.lead_status_history
    where lead_id = created_lead_id and status = 'new'
  ) <> 1 or (
    select count(*) from public.lead_telegram_deliveries
    where lead_id = created_lead_id and state = 'queued'
  ) <> 1 then
    raise exception 'lead snapshot, status history or Telegram outbox mismatch';
  end if;

  select attempt_id, lease_token
  into delivery_attempt_id, delivery_lease_token
  from public.claim_lead_telegram_delivery(created_lead_id);
  if delivery_attempt_id is null or delivery_lease_token is null then
    raise exception 'queued Telegram delivery was not claimed';
  end if;
  perform public.complete_lead_telegram_delivery(
    delivery_attempt_id, delivery_lease_token, 'succeeded',
    null, 200, null, 'verification-message', null
  );
  if not exists (
    select 1 from public.lead_telegram_deliveries
    where lead_id = created_lead_id and state = 'succeeded'
      and attempt_count = 1 and delivered_at is not null
      and provider_message_id = 'verification-message'
  ) then
    raise exception 'Telegram delivery completion mismatch';
  end if;

  update public.leads set status = 'contacted' where id = created_lead_id;
  if (
    select count(*) from public.lead_status_history
    where lead_id = created_lead_id
  ) <> 2 then
    raise exception 'lead status history update mismatch';
  end if;

  begin
    update public.leads set name = 'Изменённое имя'
    where id = created_lead_id;
    raise exception 'immutable lead name unexpectedly changed';
  exception when invalid_parameter_value then
    if sqlerrm <> 'lead fields are immutable' then raise; end if;
  end;

  begin
    perform public.submit_public_lead(
      '93000000-0000-4000-8000-000000000001',
      repeat('d', 64), repeat('b', 64), repeat('c', 64),
      'ru', 'product_page', '/ru/product/verification',
      'Другой клиент', '+37369111111', null, null,
      '20000000-0000-4000-8000-000000000001', 'stage-5-v1'
    );
    raise exception 'idempotency conflict unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm <> 'lead_idempotency_conflict' then raise; end if;
  end;
end;
$$;

insert into public.categories (
  id, presentation_key, is_published, sort_order
) values (
  '90000000-0000-4000-8000-000000000002', 'generic', false, 999
);

do $$
begin
  update public.products
  set model = model
  where id = '20000000-0000-4000-8000-000000000001';
  set constraints all immediate;
  set constraints all deferred;
end;
$$;

insert into public.categories (
  id, presentation_key, is_published, sort_order
) values (
  '90000000-0000-4000-8000-000000000020', 'generic', false, 997
), (
  '90000000-0000-4000-8000-000000000021', 'generic', false, 996
);

update public.categories
set parent_id = '90000000-0000-4000-8000-000000000021'
where id = '90000000-0000-4000-8000-000000000020';

do $$
begin
  begin
    update public.categories
    set parent_id = '90000000-0000-4000-8000-000000000020'
    where id = '90000000-0000-4000-8000-000000000021';
    raise exception 'category parent cycle unexpectedly succeeded';
  exception when check_violation then
    if sqlerrm <> 'category_parent_cycle' then raise; end if;
  end;
end;
$$;

-- The seed ships categories, products and translations only, so the attribute
-- probes below build their own group and attributes. Everything is rolled back
-- together with the surrounding transaction.
insert into public.attribute_groups (id, code, sort_order)
values ('92000000-0000-4000-8000-000000000030', 'verification_group', 995);
insert into public.attribute_group_translations (group_id, locale, name)
values
  ('92000000-0000-4000-8000-000000000030', 'ru', 'Проверочная группа'),
  ('92000000-0000-4000-8000-000000000030', 'ro', 'Grup de verificare');

insert into public.attributes (
  id, group_id, code, data_type, is_filterable, sort_order
) values (
  '92000000-0000-4000-8000-000000000031',
  '92000000-0000-4000-8000-000000000030',
  'verification_text', 'text', false, 994
);
insert into public.attribute_translations (attribute_id, locale, name)
values
  ('92000000-0000-4000-8000-000000000031', 'ru', 'Текст'),
  ('92000000-0000-4000-8000-000000000031', 'ro', 'Text');

do $$
begin
  begin
    insert into public.attribute_options (
      id, attribute_id, code, sort_order
    ) values (
      '92000000-0000-4000-8000-000000000020',
      '92000000-0000-4000-8000-000000000031',
      'invalid_text_option', 999
    );
    raise exception 'option for text attribute unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Options require a select attribute' then raise; end if;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.product_images (
      id, product_id, storage_path, is_primary
    ) values (
      '91000000-0000-4000-8000-000000000010',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001/00000000-0000-0000-0000-000000000000.webp',
      false
    );
    raise exception 'non-versioned Storage object UUID unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
end;
$$;

do $$
begin
  begin
    delete from public.product_translations
    where product_id = '20000000-0000-4000-8000-000000000001'
      and locale = 'ro';
    set constraints all immediate;
    raise exception 'missing product translation unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like '%requires ru and ro translations%' then raise; end if;
  end;
  set constraints all deferred;
end;
$$;

do $$
begin
  begin
    update public.products
    set category_id = '90000000-0000-4000-8000-000000000002'
    where id = '20000000-0000-4000-8000-000000000001';
    set constraints all immediate;
    raise exception 'draft category assignment unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like '%requires a published category%' then raise; end if;
  end;
  set constraints all deferred;
end;
$$;

do $$
begin
  begin
    insert into public.product_images (
      id, product_id, storage_path, is_primary
    ) values (
      '91000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001/91000000-0000-4000-8000-000000000002.webp',
      true
    );
    set constraints all immediate;
    raise exception 'image without alt translations unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like '%images require ru and ro alt text%' then raise; end if;
  end;
  set constraints all deferred;
end;
$$;

do $$
begin
  begin
    insert into public.attributes (
      id, group_id, code, data_type, is_filterable, sort_order
    ) values (
      '92000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000030',
      'verification_required', 'boolean', true, 999
    );
    insert into public.attribute_translations (attribute_id, locale, name)
    values
      ('92000000-0000-4000-8000-000000000001', 'ru', 'Проверка'),
      ('92000000-0000-4000-8000-000000000001', 'ro', 'Verificare');
    insert into public.category_attributes (
      category_id, attribute_id, is_required, is_filterable, sort_order
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001', true, true, 999
    );
    set constraints all immediate;
    raise exception 'missing required attribute unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like '%missing a required attribute%' then raise; end if;
  end;
  set constraints all deferred;
end;
$$;

insert into public.attributes (
  id, group_id, code, data_type, is_filterable, sort_order
) values (
  '92000000-0000-4000-8000-000000000003',
  '92000000-0000-4000-8000-000000000030',
  'verification_numeric', 'number', true, 997
);
insert into public.attribute_translations (attribute_id, locale, name)
values
  ('92000000-0000-4000-8000-000000000003', 'ru', 'Число'),
  ('92000000-0000-4000-8000-000000000003', 'ro', 'Număr');
insert into public.category_attributes (
  category_id, attribute_id, is_required, is_filterable, sort_order
) values (
  '10000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000003', false, true, 997
);
insert into public.product_attribute_values (
  id, product_id, attribute_id, number_value
) values (
  '92000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000003', 280
);

do $$
begin
  begin
    update public.attributes
    set data_type = 'boolean'
    where id = '92000000-0000-4000-8000-000000000003';
    set constraints all immediate;
    raise exception 'incompatible attribute type change unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like '%Cannot change the type%' then raise; end if;
  end;
  set constraints all deferred;
end;
$$;

do $$
begin
  begin
    insert into public.attributes (
      id, group_id, code, data_type, is_filterable, sort_order
    ) values (
      '92000000-0000-4000-8000-000000000002',
      '92000000-0000-4000-8000-000000000030',
      'verification_filter_override', 'number', false, 998
    );
    insert into public.attribute_translations (attribute_id, locale, name)
    values
      ('92000000-0000-4000-8000-000000000002', 'ru', 'Фильтр'),
      ('92000000-0000-4000-8000-000000000002', 'ro', 'Filtru');
    insert into public.category_attributes (
      category_id, attribute_id, is_required, is_filterable, sort_order
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002', false, true, 998
    );
    update public.attributes
    set data_type = 'text'
    where id = '92000000-0000-4000-8000-000000000002';
    raise exception 'filterable text override unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not like '%cannot be used as canonical filters%' then raise; end if;
  end;
end;
$$;

do $$
begin
  if (
    select max(total_count)
    from public.search_public_catalog_product_ids(
      p_locale => 'ru',
      p_attributes => '{"verification_numeric":"280"}'::jsonb
    )
  ) <> 1 then
    raise exception 'numeric catalog filter changed a significant trailing zero';
  end if;
end;
$$;

rollback;
