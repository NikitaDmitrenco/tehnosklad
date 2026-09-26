-- Transactional RLS verification after `npm run db:reset:local`.
-- The script creates temporary rows, performs real assertions and rolls back.

begin;

insert into public.categories (
  id, presentation_key, is_published, sort_order
) values (
  '90000000-0000-4000-8000-000000000001', 'generic', false, 999
);
insert into public.category_translations (
  category_id, locale, name, slug, short_description, description
) values
  (
    '90000000-0000-4000-8000-000000000001', 'ru', 'Черновик',
    'rls-draft-ru', 'Не виден', 'Не виден'
  ),
  (
    '90000000-0000-4000-8000-000000000001', 'ro', 'Schiță',
    'rls-draft-ro', 'Nu este vizibil', 'Nu este vizibil'
  );

insert into public.products (
  id, category_id, brand, model, sku, price_minor, is_published, sort_order
) values (
  '90000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  'Draft', 'Draft', 'RLS-DRAFT-PRODUCT', 100, false, 999
);
insert into public.product_translations (
  product_id, locale, name, slug, short_description, description
) values
  (
    '90000000-0000-4000-8000-000000000003', 'ru', 'Черновой товар',
    'rls-draft-product-ru', 'Не виден', 'Не виден'
  ),
  (
    '90000000-0000-4000-8000-000000000003', 'ro', 'Produs schiță',
    'rls-draft-product-ro', 'Nu este vizibil', 'Nu este vizibil'
  );

insert into public.product_images (
  id, product_id, storage_path, sort_order, is_primary, deletion_pending_at
) values (
  '90000000-0000-4000-8000-000000000030',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001/90000000-0000-4000-8000-000000000031.webp',
  999, false, now()
);
insert into public.product_image_translations (image_id, locale, alt_text)
values
  ('90000000-0000-4000-8000-000000000030', 'ru', 'Скрытое удаление'),
  ('90000000-0000-4000-8000-000000000030', 'ro', 'Ștergere ascunsă');

-- The seed grows with the catalog, so anon visibility is asserted against
-- expectations derived from the data instead of hard-coded seed counts: anon
-- must see exactly the published rows, and none of the drafts inserted above.
-- The expectations are computed here, while the session is still privileged.
create temporary table rls_expected on commit drop as
select
  (
    select count(*) from public.products as product
    join public.categories as category on category.id = product.category_id
    where product.is_published and product.archived_at is null
      and category.is_published and category.archived_at is null
  ) as products,
  (
    select count(*) from public.categories
    where is_published and archived_at is null
  ) as categories,
  (select count(*) from public.site_settings) as site_settings,
  (
    select count(*) from public.category_translations as translation
    join public.categories as category
      on category.id = translation.category_id
    where category.is_published and category.archived_at is null
  ) as category_translations,
  (
    select count(*) from public.product_translations as translation
    join public.products as product on product.id = translation.product_id
    join public.categories as category on category.id = product.category_id
    where product.is_published and product.archived_at is null
      and category.is_published and category.archived_at is null
  ) as product_translations,
  (
    select count(*) from public.category_attributes as binding
    join public.categories as category on category.id = binding.category_id
    join public.attributes as attribute on attribute.id = binding.attribute_id
    where category.is_published and category.archived_at is null
      and attribute.is_active
  ) as category_attributes,
  (
    select count(*) from public.product_attribute_values as value
    join public.products as product on product.id = value.product_id
    join public.categories as category on category.id = product.category_id
    join public.attributes as attribute on attribute.id = value.attribute_id
    join public.category_attributes as binding
      on binding.category_id = product.category_id
     and binding.attribute_id = attribute.id
    where product.is_published and product.archived_at is null
      and category.is_published and category.archived_at is null
      and attribute.is_active
  ) as product_attribute_values,
  (
    select count(*) from public.attribute_groups as attribute_group
    where attribute_group.is_active and exists (
      select 1 from public.attributes as attribute
      join public.category_attributes as binding
        on binding.attribute_id = attribute.id
      join public.categories as category on category.id = binding.category_id
      where attribute.group_id = attribute_group.id and attribute.is_active
        and category.is_published and category.archived_at is null
    )
  ) as attribute_groups;
grant select on rls_expected to anon, authenticated;

set local role anon;

do $$
declare
  expected pg_temp.rls_expected;
begin
  select * into expected from pg_temp.rls_expected;
  if (select count(*) from public.products) <> expected.products then
    raise exception 'anon published product count does not match the catalog';
  end if;
  if (select count(*) from public.categories) <> expected.categories then
    raise exception 'anon published category count does not match the catalog';
  end if;
  if (select count(*) from public.site_settings) <> expected.site_settings then
    raise exception 'anon public settings count does not match site_settings';
  end if;
  if (select count(*) from public.category_translations)
    <> expected.category_translations
  then
    raise exception 'anon category translation count does not match the catalog';
  end if;
  if (select count(*) from public.product_translations)
    <> expected.product_translations
  then
    raise exception 'anon product translation count does not match the catalog';
  end if;
  if (select count(*) from public.category_attributes)
    <> expected.category_attributes
  then
    raise exception 'anon category attribute count does not match the catalog';
  end if;
  if (select count(*) from public.product_attribute_values)
    <> expected.product_attribute_values
  then
    raise exception 'anon product attribute value count does not match the catalog';
  end if;
  if (select count(*) from public.attribute_groups)
    <> expected.attribute_groups
  then
    raise exception 'anon attribute group visibility does not match the catalog';
  end if;
  if exists (select 1 from public.category_slug_routes)
    or exists (select 1 from public.product_slug_routes)
  then
    raise exception 'anon can read current or draft slug routes';
  end if;

  if (
    select max(total_count)
    from public.search_public_catalog_product_ids('ru')
  ) <> expected.products then
    raise exception 'anon catalog search count does not match the catalog';
  end if;
  if exists (
    select 1
    from public.search_public_catalog_product_ids(
      p_locale => 'ru', p_brand => 'Draft'
    )
    where product_id is not null or total_count <> 0
  ) then
    raise exception 'anon catalog search exposes draft products';
  end if;

  -- The filters may only describe products the caller can read, so an
  -- unpublished product must never reach the brand list.
  if public.get_public_catalog_facets('ru') -> 'brands' ? 'Draft' then
    raise exception 'anon catalog facets expose a draft product brand';
  end if;

  if exists (
    select 1 from public.categories
    where id = '90000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'anon can read a draft category';
  end if;

  if exists (
    select 1 from public.products
    where id = '90000000-0000-4000-8000-000000000003'
  ) or exists (
    select 1 from public.product_translations
    where product_id = '90000000-0000-4000-8000-000000000003'
  ) then
    raise exception 'anon can read a draft product or child translation';
  end if;

  if exists (
    select 1 from public.product_images
    where id = '90000000-0000-4000-8000-000000000030'
  ) or exists (
    select 1 from public.product_image_translations
    where image_id = '90000000-0000-4000-8000-000000000030'
  ) then
    raise exception 'anon can read deletion-pending image metadata';
  end if;

  if exists (
    select 1 from public.attribute_groups where not is_active
  ) then
    raise exception 'anon can read an inactive attribute group';
  end if;

  begin
    perform count(*) from public.leads;
    raise exception 'anon lead select unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.products (
      category_id, brand, model, sku, price_minor
    ) values (
      '10000000-0000-4000-8000-000000000001', 'Denied', 'Denied',
      'ANON-MUST-FAIL', 100
    );
    raise exception 'anon insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege('anon', 'private.is_admin()', 'execute') then
    raise exception 'anon can execute private.is_admin()';
  end if;
  if has_table_privilege('anon', 'public.products', 'insert')
    or has_table_privilege('anon', 'public.products', 'update')
    or has_table_privilege('anon', 'public.products', 'delete')
  then
    raise exception 'anon has catalog write grants';
  end if;
  if has_table_privilege('anon', 'public.product_slug_routes', 'insert')
    or has_table_privilege('authenticated', 'public.category_slug_routes', 'update')
  then
    raise exception 'slug route write grants are public';
  end if;
  if has_table_privilege('anon', 'public.leads', 'select')
    or has_table_privilege('anon', 'public.leads', 'insert')
    or has_function_privilege(
      'anon',
      'public.submit_public_lead(uuid,text,text,text,public.app_locale,public.lead_source,text,text,text,text,text,uuid,text)',
      'execute'
    )
  then
    raise exception 'anonymous lead storage access is public';
  end if;
  if has_function_privilege(
    'anon',
    'public.admin_save_category(uuid,uuid,text,integer,boolean,jsonb,jsonb)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.admin_set_lead_status(uuid,public.lead_status)',
    'execute'
  ) then
    raise exception 'anonymous role can execute Stage 6 admin RPC';
  end if;
end;
$$;

set local role authenticated;

do $$
declare
  expected pg_temp.rls_expected;
begin
  select * into expected from pg_temp.rls_expected;
  if (select count(*) from public.products) <> expected.products
    or (select count(*) from public.categories) <> expected.categories
  then
    raise exception 'authenticated non-admin catalog differs from anon';
  end if;
  if exists (select 1 from public.profiles)
    or exists (select 1 from public.user_roles)
  then
    raise exception 'authenticated request without uid can read identity rows';
  end if;
  if exists (select 1 from public.leads)
    or exists (select 1 from public.lead_status_history)
    or exists (select 1 from public.lead_telegram_deliveries)
    or exists (select 1 from public.lead_delivery_attempts)
  then
    raise exception 'authenticated non-admin can read lead data';
  end if;
  begin
    insert into public.user_roles (user_id, role)
    values ('90000000-0000-4000-8000-000000000099', 'admin');
    raise exception 'authenticated non-admin self-role insert succeeded';
  exception when insufficient_privilege then
      null;
  end;
  begin
    perform public.admin_set_lead_status(
      '90000000-0000-4000-8000-000000000099', 'spam'
    );
    raise exception 'authenticated non-admin admin RPC succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

rollback;

-- Authenticated non-admin/admin tests require real local Auth JWTs so auth.uid()
-- is populated. Follow docs/rls-access-matrix.md for the exact dashboard steps.
