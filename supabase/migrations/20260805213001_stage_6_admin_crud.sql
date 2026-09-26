-- Tehnosklad Stage 6: atomic admin CRUD helpers and image deletion workflow.

alter table public.product_images
  add column deletion_pending_at timestamptz;

create index product_images_deletion_pending_idx
  on public.product_images (deletion_pending_at)
  where deletion_pending_at is not null;

create function private.validate_category_parent_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then return new; end if;
  if exists (
    with recursive ancestors(id, parent_id) as (
      select category.id, category.parent_id
      from public.categories as category
      where category.id = new.parent_id
      union all
      select category.id, category.parent_id
      from public.categories as category
      join ancestors on ancestors.parent_id = category.id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'category_parent_cycle' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_category_parent_cycle
before insert or update of parent_id on public.categories
for each row execute function private.validate_category_parent_cycle();

revoke all on function private.validate_category_parent_cycle()
  from public, anon, authenticated, service_role;

create function private.validate_category_tree_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_published and new.parent_id is not null and not exists (
    select 1 from public.categories as parent
    where parent.id = new.parent_id
      and parent.is_published and parent.archived_at is null
  ) then
    raise exception 'Published child category requires a published parent';
  end if;
  if (not new.is_published or new.archived_at is not null) and exists (
    select 1 from public.categories as child
    where child.parent_id = new.id
      and child.is_published and child.archived_at is null
  ) then
    raise exception 'Published child categories require an active parent';
  end if;
  return null;
end;
$$;

create constraint trigger validate_category_tree_publication
after insert or update on public.categories
deferrable initially deferred
for each row execute function private.validate_category_tree_publication();

revoke all on function private.validate_category_tree_publication()
  from public, anon, authenticated, service_role;

alter table public.attributes drop constraint attributes_group_id_fkey;
alter table public.attributes
  add constraint attributes_group_id_fkey foreign key (group_id)
  references public.attribute_groups (id) on delete restrict;

create function private.validate_attribute_option_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_type public.attribute_data_type;
begin
  select data_type into target_type
  from public.attributes where id = new.attribute_id;
  if target_type not in ('single_select', 'multi_select') then
    raise exception 'Options require a select attribute';
  end if;
  return new;
end;
$$;

create trigger validate_attribute_option_type
before insert or update on public.attribute_options
for each row execute function private.validate_attribute_option_type();

create function private.protect_attribute_type_with_options()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.data_type is distinct from old.data_type and exists (
    select 1 from public.attribute_options where attribute_id = new.id
  ) then
    raise exception 'Cannot change the type of an attribute with options';
  end if;
  return new;
end;
$$;

create trigger protect_attribute_type_with_options
before update of data_type on public.attributes
for each row execute function private.protect_attribute_type_with_options();

revoke all on function private.validate_attribute_option_type()
  from public, anon, authenticated, service_role;
revoke all on function private.protect_attribute_type_with_options()
  from public, anon, authenticated, service_role;

create unique index product_attribute_values_unique_option_idx
  on public.product_attribute_values (product_id, attribute_id, option_id)
  where option_id is not null;

create index product_attribute_values_option_fk_idx
  on public.product_attribute_values (option_id, attribute_id)
  where option_id is not null;

create index lead_status_history_changed_by_fk_idx
  on public.lead_status_history (changed_by)
  where changed_by is not null;

drop policy public_product_images_select on public.product_images;
create policy public_product_images_select on public.product_images
for select to anon, authenticated
using (
  deletion_pending_at is null and exists (
    select 1 from public.products as product
    where product.id = product_id
      and product.is_published and product.archived_at is null
  )
);

create function public.admin_save_category(
  p_id uuid,
  p_parent_id uuid,
  p_presentation_key text,
  p_sort_order integer,
  p_is_published boolean,
  p_ru jsonb,
  p_ro jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := coalesce(p_id, extensions.gen_random_uuid());
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_ru) <> 'object' or jsonb_typeof(p_ro) <> 'object' then
    raise exception 'invalid_translations' using errcode = '22023';
  end if;

  insert into public.categories (
    id, parent_id, presentation_key, sort_order, is_published
  ) values (
    target_id, p_parent_id, p_presentation_key, p_sort_order, false
  )
  on conflict (id) do update set
    parent_id = excluded.parent_id,
    presentation_key = excluded.presentation_key,
    sort_order = excluded.sort_order;

  insert into public.category_translations (
    category_id, locale, name, slug, short_description, description,
    seo_title, seo_description
  ) values
    (
      target_id, 'ru', p_ru->>'name', p_ru->>'slug',
      p_ru->>'shortDescription', p_ru->>'description',
      nullif(p_ru->>'seoTitle', ''), nullif(p_ru->>'seoDescription', '')
    ),
    (
      target_id, 'ro', p_ro->>'name', p_ro->>'slug',
      p_ro->>'shortDescription', p_ro->>'description',
      nullif(p_ro->>'seoTitle', ''), nullif(p_ro->>'seoDescription', '')
    )
  on conflict (category_id, locale) do update set
    name = excluded.name,
    slug = excluded.slug,
    short_description = excluded.short_description,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description;

  update public.categories
  set is_published = p_is_published
  where id = target_id;
  return target_id;
end;
$$;

create function public.admin_set_category_archived(
  p_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_archived and (
    exists (
      select 1 from public.products
      where category_id = p_id and archived_at is null
    ) or exists (
      select 1 from public.categories
      where parent_id = p_id and archived_at is null
    )
  ) then
    raise exception 'category_in_use' using errcode = '23503';
  end if;
  update public.categories
  set is_published = case when p_archived then false else is_published end,
      archived_at = case when p_archived then now() else null end
  where id = p_id;
  if not found then raise exception 'category_not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.admin_save_attribute_group(
  p_id uuid,
  p_code text,
  p_sort_order integer,
  p_is_active boolean,
  p_name_ru text,
  p_name_ro text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := coalesce(p_id, extensions.gen_random_uuid());
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  insert into public.attribute_groups (id, code, sort_order, is_active)
  values (target_id, p_code, p_sort_order, p_is_active)
  on conflict (id) do update set code = excluded.code,
    sort_order = excluded.sort_order, is_active = excluded.is_active;
  insert into public.attribute_group_translations (group_id, locale, name)
  values (target_id, 'ru', p_name_ru), (target_id, 'ro', p_name_ro)
  on conflict (group_id, locale) do update set name = excluded.name;
  return target_id;
end;
$$;

create function public.admin_delete_attribute_group(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.attributes where group_id = p_id) then
    raise exception 'attribute_group_in_use' using errcode = '23503';
  end if;
  delete from public.attribute_groups where id = p_id;
  if not found then raise exception 'attribute_group_not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.admin_save_attribute(
  p_id uuid,
  p_group_id uuid,
  p_code text,
  p_data_type public.attribute_data_type,
  p_unit_code text,
  p_is_filterable boolean,
  p_sort_order integer,
  p_is_active boolean,
  p_ru jsonb,
  p_ro jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := coalesce(p_id, extensions.gen_random_uuid());
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  insert into public.attributes (
    id, group_id, code, data_type, unit_code,
    is_filterable, sort_order, is_active
  ) values (
    target_id, p_group_id, p_code, p_data_type, nullif(p_unit_code, ''),
    p_is_filterable, p_sort_order, p_is_active
  )
  on conflict (id) do update set
    group_id = excluded.group_id, code = excluded.code,
    data_type = excluded.data_type, unit_code = excluded.unit_code,
    is_filterable = excluded.is_filterable,
    sort_order = excluded.sort_order, is_active = excluded.is_active;
  insert into public.attribute_translations (
    attribute_id, locale, name, help_text, unit_label
  ) values
    (target_id, 'ru', p_ru->>'name', nullif(p_ru->>'helpText', ''), nullif(p_ru->>'unitLabel', '')),
    (target_id, 'ro', p_ro->>'name', nullif(p_ro->>'helpText', ''), nullif(p_ro->>'unitLabel', ''))
  on conflict (attribute_id, locale) do update set
    name = excluded.name, help_text = excluded.help_text,
    unit_label = excluded.unit_label;
  return target_id;
end;
$$;

create function public.admin_delete_attribute(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.category_attributes where attribute_id = p_id)
    or exists (select 1 from public.product_attribute_values where attribute_id = p_id)
  then
    raise exception 'attribute_in_use' using errcode = '23503';
  end if;
  delete from public.attributes where id = p_id;
  if not found then raise exception 'attribute_not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.admin_save_attribute_option(
  p_id uuid,
  p_attribute_id uuid,
  p_code text,
  p_sort_order integer,
  p_is_active boolean,
  p_label_ru text,
  p_label_ro text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := coalesce(p_id, extensions.gen_random_uuid());
  target_type public.attribute_data_type;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select data_type into target_type from public.attributes where id = p_attribute_id;
  if target_type not in ('single_select', 'multi_select') then
    raise exception 'attribute_options_not_supported' using errcode = '22023';
  end if;
  insert into public.attribute_options (
    id, attribute_id, code, sort_order, is_active
  ) values (target_id, p_attribute_id, p_code, p_sort_order, p_is_active)
  on conflict (id) do update set code = excluded.code,
    sort_order = excluded.sort_order, is_active = excluded.is_active
  where attribute_options.attribute_id = excluded.attribute_id;
  if not found then raise exception 'option_attribute_immutable' using errcode = '22023'; end if;
  insert into public.attribute_option_translations (option_id, locale, label)
  values (target_id, 'ru', p_label_ru), (target_id, 'ro', p_label_ro)
  on conflict (option_id, locale) do update set label = excluded.label;
  return target_id;
end;
$$;

create function public.admin_delete_attribute_option(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if exists (select 1 from public.product_attribute_values where option_id = p_id) then
    raise exception 'attribute_option_in_use' using errcode = '23503';
  end if;
  delete from public.attribute_options where id = p_id;
  if not found then raise exception 'attribute_option_not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.admin_set_category_attribute(
  p_category_id uuid,
  p_attribute_id uuid,
  p_enabled boolean,
  p_is_required boolean,
  p_is_filterable boolean,
  p_sort_order integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not p_enabled then
    if exists (
      select 1 from public.product_attribute_values as value
      join public.products as product on product.id = value.product_id
      where product.category_id = p_category_id
        and value.attribute_id = p_attribute_id
    ) then
      raise exception 'category_attribute_in_use' using errcode = '23503';
    end if;
    delete from public.category_attributes
    where category_id = p_category_id and attribute_id = p_attribute_id;
    return;
  end if;
  insert into public.category_attributes (
    category_id, attribute_id, is_required, is_filterable, sort_order
  ) values (
    p_category_id, p_attribute_id, p_is_required, p_is_filterable, p_sort_order
  ) on conflict (category_id, attribute_id) do update set
    is_required = excluded.is_required,
    is_filterable = excluded.is_filterable,
    sort_order = excluded.sort_order;
end;
$$;

create function public.admin_save_product(
  p_id uuid,
  p_category_id uuid,
  p_brand text,
  p_model text,
  p_sku text,
  p_price_minor bigint,
  p_old_price_minor bigint,
  p_availability public.availability_status,
  p_quantity integer,
  p_is_popular boolean,
  p_is_new boolean,
  p_is_published boolean,
  p_sort_order integer,
  p_ru jsonb,
  p_ro jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := coalesce(p_id, extensions.gen_random_uuid());
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_id is not null and exists (
    select 1 from public.products as product
    join public.product_attribute_values as value on value.product_id = product.id
    where product.id = p_id and product.category_id <> p_category_id
      and not exists (
        select 1 from public.category_attributes as binding
        where binding.category_id = p_category_id
          and binding.attribute_id = value.attribute_id
      )
  ) then
    raise exception 'product_category_attributes_incompatible' using errcode = '23503';
  end if;
  insert into public.products (
    id, category_id, brand, model, sku, price_minor, old_price_minor,
    availability, quantity, is_popular, is_new, is_published, sort_order
  ) values (
    target_id, p_category_id, p_brand, p_model, p_sku, p_price_minor,
    p_old_price_minor, p_availability, p_quantity, p_is_popular, p_is_new,
    false, p_sort_order
  ) on conflict (id) do update set
    category_id = excluded.category_id, brand = excluded.brand,
    model = excluded.model, sku = excluded.sku,
    price_minor = excluded.price_minor, old_price_minor = excluded.old_price_minor,
    availability = excluded.availability, quantity = excluded.quantity,
    is_popular = excluded.is_popular, is_new = excluded.is_new,
    sort_order = excluded.sort_order;
  insert into public.product_translations (
    product_id, locale, name, slug, short_description, description,
    seo_title, seo_description
  ) values
    (target_id, 'ru', p_ru->>'name', p_ru->>'slug', p_ru->>'shortDescription', p_ru->>'description', nullif(p_ru->>'seoTitle', ''), nullif(p_ru->>'seoDescription', '')),
    (target_id, 'ro', p_ro->>'name', p_ro->>'slug', p_ro->>'shortDescription', p_ro->>'description', nullif(p_ro->>'seoTitle', ''), nullif(p_ro->>'seoDescription', ''))
  on conflict (product_id, locale) do update set
    name = excluded.name, slug = excluded.slug,
    short_description = excluded.short_description,
    description = excluded.description, seo_title = excluded.seo_title,
    seo_description = excluded.seo_description;
  update public.products set is_published = p_is_published where id = target_id;
  return target_id;
end;
$$;

create function public.admin_replace_product_attribute_values(
  p_product_id uuid,
  p_values jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  option_item jsonb;
  target_attribute public.attributes%rowtype;
  target_value_id uuid;
  ordinal_value integer;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_values) <> 'array' or jsonb_array_length(p_values) > 200 then
    raise exception 'invalid_attribute_values' using errcode = '22023';
  end if;
  delete from public.product_attribute_values where product_id = p_product_id;
  for item in select value from jsonb_array_elements(p_values)
  loop
    select attribute.* into target_attribute
    from public.attributes as attribute
    join public.products as product on product.id = p_product_id
    join public.category_attributes as binding
      on binding.category_id = product.category_id
      and binding.attribute_id = attribute.id
    where attribute.id = (item->>'attributeId')::uuid and attribute.is_active;
    if not found then
      raise exception 'invalid_product_attribute' using errcode = '22023';
    end if;
    if target_attribute.data_type = 'multi_select' then
      ordinal_value := 0;
      for option_item in select value from jsonb_array_elements(coalesce(item->'optionIds', '[]'::jsonb))
      loop
        insert into public.product_attribute_values (
          product_id, attribute_id, ordinal, option_id
        ) values (
          p_product_id, target_attribute.id, ordinal_value,
          trim(both '"' from option_item::text)::uuid
        );
        ordinal_value := ordinal_value + 1;
      end loop;
    else
      target_value_id := extensions.gen_random_uuid();
      insert into public.product_attribute_values (
        id, product_id, attribute_id, ordinal,
        text_value_key, number_value, boolean_value, option_id, color_value
      ) values (
        target_value_id, p_product_id, target_attribute.id, 0,
        case when target_attribute.data_type = 'text' then target_attribute.code end,
        case when target_attribute.data_type = 'number' then (item->>'value')::numeric end,
        case when target_attribute.data_type = 'boolean' then (item->>'value')::boolean end,
        case when target_attribute.data_type = 'single_select' then (item->>'value')::uuid end,
        case when target_attribute.data_type = 'color' then item->>'value' end
      );
      if target_attribute.data_type = 'text' then
        insert into public.product_attribute_value_translations (
          value_id, locale, text_value
        ) values
          (target_value_id, 'ru', item->>'ru'),
          (target_value_id, 'ro', item->>'ro');
      end if;
    end if;
  end loop;
end;
$$;

create function public.admin_set_product_archived(p_id uuid, p_archived boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  update public.products
  set is_published = case when p_archived then false else is_published end,
      archived_at = case when p_archived then now() else null end
  where id = p_id;
  if not found then raise exception 'product_not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.admin_create_product_image(
  p_product_id uuid,
  p_storage_path text,
  p_alt_ru text,
  p_alt_ro text,
  p_sort_order integer,
  p_is_primary boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := extensions.gen_random_uuid();
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_is_primary then
    update public.product_images set is_primary = false
    where product_id = p_product_id;
  end if;
  insert into public.product_images (
    id, product_id, storage_path, sort_order, is_primary
  ) values (
    target_id, p_product_id, p_storage_path, p_sort_order, p_is_primary
  );
  insert into public.product_image_translations (image_id, locale, alt_text)
  values (target_id, 'ru', p_alt_ru), (target_id, 'ro', p_alt_ro);
  return target_id;
end;
$$;

create function public.admin_update_product_image(
  p_image_id uuid,
  p_alt_ru text,
  p_alt_ro text,
  p_sort_order integer,
  p_is_primary boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_product_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select product_id into target_product_id from public.product_images
  where id = p_image_id and deletion_pending_at is null;
  if not found then raise exception 'product_image_not_found' using errcode = 'P0002'; end if;
  if p_is_primary then
    update public.product_images set is_primary = false
    where product_id = target_product_id and id <> p_image_id;
  end if;
  update public.product_images
  set sort_order = p_sort_order, is_primary = p_is_primary
  where id = p_image_id;
  insert into public.product_image_translations (image_id, locale, alt_text)
  values (p_image_id, 'ru', p_alt_ru), (p_image_id, 'ro', p_alt_ro)
  on conflict (image_id, locale) do update set alt_text = excluded.alt_text;
end;
$$;

create function public.admin_mark_product_image_deleting(p_image_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_path text;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  update public.product_images
  set deletion_pending_at = now(), is_primary = false
  where id = p_image_id and deletion_pending_at is null
  returning storage_path into target_path;
  if target_path is null then raise exception 'product_image_not_found' using errcode = 'P0002'; end if;
  return target_path;
end;
$$;

create function public.admin_cancel_product_image_deleting(p_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  update public.product_images set deletion_pending_at = null
  where id = p_image_id and deletion_pending_at is not null;
end;
$$;

create function public.admin_finalize_product_image_deleting(p_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  delete from public.product_images
  where id = p_image_id and deletion_pending_at is not null;
  if not found then raise exception 'product_image_not_pending' using errcode = '22023'; end if;
end;
$$;

create function public.admin_set_lead_status(
  p_lead_id uuid,
  p_status public.lead_status
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  update public.leads set status = p_status where id = p_lead_id;
  if not found then raise exception 'lead_not_found' using errcode = 'P0002'; end if;
end;
$$;

create function public.admin_set_public_site_setting(
  p_key text,
  p_locale public.app_locale,
  p_value text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_key not in (
    'phone_display', 'phone_href', 'address', 'open_days',
    'open_time', 'closed_day', 'contact_text'
  ) then
    raise exception 'site_setting_not_allowed' using errcode = '22023';
  end if;
  update public.site_settings set value = p_value
  where key = p_key and locale = p_locale;
  if not found then
    raise exception 'site_setting_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.admin_set_public_site_setting_pair(
  p_key text,
  p_ru text,
  p_ro text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_key not in (
    'phone_display', 'phone_href', 'address', 'open_days',
    'open_time', 'closed_day', 'contact_text'
  ) then
    raise exception 'site_setting_not_allowed' using errcode = '22023';
  end if;
  update public.site_settings
  set value = case locale when 'ru' then p_ru else p_ro end
  where key = p_key and locale in ('ru', 'ro');
  if not found or (
    select count(*) from public.site_settings where key = p_key
  ) <> 2 then
    raise exception 'site_setting_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_save_category(uuid,uuid,text,integer,boolean,jsonb,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_category_archived(uuid,boolean) from public, anon, authenticated, service_role;
revoke all on function public.admin_save_attribute_group(uuid,text,integer,boolean,text,text) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_attribute_group(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_save_attribute(uuid,uuid,text,public.attribute_data_type,text,boolean,integer,boolean,jsonb,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_attribute(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_save_attribute_option(uuid,uuid,text,integer,boolean,text,text) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_attribute_option(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_category_attribute(uuid,uuid,boolean,boolean,boolean,integer) from public, anon, authenticated, service_role;
revoke all on function public.admin_save_product(uuid,uuid,text,text,text,bigint,bigint,public.availability_status,integer,boolean,boolean,boolean,integer,jsonb,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.admin_replace_product_attribute_values(uuid,jsonb) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_product_archived(uuid,boolean) from public, anon, authenticated, service_role;
revoke all on function public.admin_create_product_image(uuid,text,text,text,integer,boolean) from public, anon, authenticated, service_role;
revoke all on function public.admin_update_product_image(uuid,text,text,integer,boolean) from public, anon, authenticated, service_role;
revoke all on function public.admin_mark_product_image_deleting(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_cancel_product_image_deleting(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_finalize_product_image_deleting(uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_lead_status(uuid,public.lead_status) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_public_site_setting(text,public.app_locale,text) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_public_site_setting_pair(text,text,text) from public, anon, authenticated, service_role;

grant execute on function public.admin_save_category(uuid,uuid,text,integer,boolean,jsonb,jsonb) to authenticated;
grant execute on function public.admin_set_category_archived(uuid,boolean) to authenticated;
grant execute on function public.admin_save_attribute_group(uuid,text,integer,boolean,text,text) to authenticated;
grant execute on function public.admin_delete_attribute_group(uuid) to authenticated;
grant execute on function public.admin_save_attribute(uuid,uuid,text,public.attribute_data_type,text,boolean,integer,boolean,jsonb,jsonb) to authenticated;
grant execute on function public.admin_delete_attribute(uuid) to authenticated;
grant execute on function public.admin_save_attribute_option(uuid,uuid,text,integer,boolean,text,text) to authenticated;
grant execute on function public.admin_delete_attribute_option(uuid) to authenticated;
grant execute on function public.admin_set_category_attribute(uuid,uuid,boolean,boolean,boolean,integer) to authenticated;
grant execute on function public.admin_save_product(uuid,uuid,text,text,text,bigint,bigint,public.availability_status,integer,boolean,boolean,boolean,integer,jsonb,jsonb) to authenticated;
grant execute on function public.admin_replace_product_attribute_values(uuid,jsonb) to authenticated;
grant execute on function public.admin_set_product_archived(uuid,boolean) to authenticated;
grant execute on function public.admin_create_product_image(uuid,text,text,text,integer,boolean) to authenticated;
grant execute on function public.admin_update_product_image(uuid,text,text,integer,boolean) to authenticated;
grant execute on function public.admin_mark_product_image_deleting(uuid) to authenticated;
grant execute on function public.admin_cancel_product_image_deleting(uuid) to authenticated;
grant execute on function public.admin_finalize_product_image_deleting(uuid) to authenticated;
grant execute on function public.admin_set_lead_status(uuid,public.lead_status) to authenticated;
grant execute on function public.admin_set_public_site_setting(text,public.app_locale,text) to authenticated;
grant execute on function public.admin_set_public_site_setting_pair(text,text,text) to authenticated;

revoke insert, delete, update on table public.site_settings from authenticated;
grant update (value) on table public.site_settings to authenticated;

create index leads_source_locale_created_idx
  on public.leads (source, locale, created_at desc);
