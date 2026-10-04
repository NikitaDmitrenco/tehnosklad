
BEGIN;

-- 1. SCHEMAS & GRANTS
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- 2. PRIVATE TABLES FOR RATE LIMITING
CREATE TABLE IF NOT EXISTS private.lead_rate_limits (
  subject_hash text not null,
  bucket text not null,
  submission_count integer not null default 1,
  window_start timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  primary key (subject_hash, bucket)
);
CREATE INDEX IF NOT EXISTS lead_rate_limits_expires_at_idx ON private.lead_rate_limits (expires_at);

CREATE TABLE IF NOT EXISTS private.assistant_rate_limits (
  subject_hash text not null primary key,
  request_count integer not null default 1,
  window_start timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null
);
CREATE INDEX IF NOT EXISTS assistant_rate_limits_expires_at_idx ON private.assistant_rate_limits (expires_at);

-- 3. PRIVATE SCHEMA FUNCTIONS (VERBATIM FROM MIGRATIONS)
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.user_roles as user_role
    join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = (select auth.uid())
      and user_role.role = 'admin'::public.app_role
      and profile.is_active
  );
$$;

CREATE OR REPLACE FUNCTION private.validate_product_attribute_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
declare
  expected_type public.attribute_data_type;
  product_category uuid;
begin
  select attribute.data_type into expected_type
  from public.attributes as attribute
  where attribute.id = new.attribute_id and attribute.is_active;

  select product.category_id into product_category
  from public.products as product
  where product.id = new.product_id;

  if expected_type is null or product_category is null or not exists (
    select 1 from public.category_attributes as category_attribute
    where category_attribute.category_id = product_category
      and category_attribute.attribute_id = new.attribute_id
  ) then
    raise exception 'Invalid product attribute relation';
  end if;

  if (expected_type = 'text' and new.text_value_key is null)
    or (expected_type = 'number' and new.number_value is null)
    or (expected_type = 'boolean' and new.boolean_value is null)
    or (expected_type in ('single_select', 'multi_select') and new.option_id is null)
    or (expected_type = 'color' and new.color_value is null)
  then
    raise exception 'Attribute value does not match its data type';
  end if;

  if expected_type <> 'multi_select' and new.ordinal <> 0 then
    raise exception 'Only multi-select attributes can have multiple values';
  end if;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_category_attribute()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
declare
  attribute_type public.attribute_data_type;
  default_filterable boolean;
begin
  select attribute.data_type, attribute.is_filterable
    into attribute_type, default_filterable
  from public.attributes as attribute
  where attribute.id = new.attribute_id;

  if attribute_type = 'text' and coalesce(new.is_filterable, default_filterable) then
    raise exception 'Text attributes cannot be used as canonical filters';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_attribute_filterability()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
begin
  if tg_op = 'UPDATE' and new.data_type <> old.data_type and exists (
    select 1 from public.product_attribute_values as value
    where value.attribute_id = new.id
  ) then
    raise exception 'Cannot change the type of an attribute with product values';
  end if;

  if new.data_type = 'text' and (
    new.is_filterable or exists (
      select 1 from public.category_attributes as category_attribute
      where category_attribute.attribute_id = new.id
        and category_attribute.is_filterable
    )
  ) then
    raise exception 'Text attributes cannot be used as canonical filters';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.assert_category_publishable(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  if exists (
    select 1 from public.categories as category
    where category.id = target_id and category.is_published
  ) and (
    select count(*) from public.category_translations as translation
    where translation.category_id = target_id
  ) <> 2 then
    raise exception 'Published category requires ru and ro translations';
  end if;

  if exists (
    select 1
    from public.products as product
    left join public.categories as category on category.id = product.category_id
    where product.category_id = target_id and product.is_published
      and (category.id is null or not category.is_published or category.archived_at is not null)
  ) then
    raise exception 'Published products require a published category';
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION private.assert_product_publishable(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
declare
  target_category_id uuid;
begin
  select product.category_id into target_category_id
  from public.products as product
  where product.id = target_id and product.is_published;

  if target_category_id is not null then
    if not exists (
      select 1 from public.categories as category
      where category.id = target_category_id
        and category.is_published and category.archived_at is null
    ) then
      raise exception 'Published product requires a published category';
    end if;

    if (
      select count(*) from public.product_translations as translation
      where translation.product_id = target_id
    ) <> 2 then
      raise exception 'Published product requires ru and ro translations';
    end if;

    if exists (
      select 1
      from public.product_attribute_values as value
      join public.attributes as attribute on attribute.id = value.attribute_id
      where value.product_id = target_id and attribute.data_type = 'text'
        and (
          select count(*)
          from public.product_attribute_value_translations as translation
          where translation.value_id = value.id
        ) <> 2
    ) then
      raise exception 'Published text attributes require ru and ro translations';
    end if;

    if exists (
      select 1
      from public.product_images as image
      where image.product_id = target_id and (
        select count(*)
        from public.product_image_translations as translation
        where translation.image_id = image.id
      ) <> 2
    ) then
      raise exception 'Published images require ru and ro alt text';
    end if;

    if exists (
      select 1 from public.category_attributes as category_attribute
      where category_attribute.category_id = target_category_id
        and category_attribute.is_required
        and not exists (
          select 1 from public.product_attribute_values as value
          where value.product_id = target_id
            and value.attribute_id = category_attribute.attribute_id
        )
    ) then
      raise exception 'Published product is missing a required attribute';
    end if;

    if exists (
      select 1
      from public.product_attribute_values as value
      join public.attributes as attribute on attribute.id = value.attribute_id
      where value.product_id = target_id
        and (
          not attribute.is_active
          or not (
            (attribute.data_type = 'text' and value.text_value_key is not null)
            or (attribute.data_type = 'number' and value.number_value is not null)
            or (attribute.data_type = 'boolean' and value.boolean_value is not null)
            or (attribute.data_type in ('single_select', 'multi_select') and value.option_id is not null)
            or (attribute.data_type = 'color' and value.color_value is not null)
          )
          or (attribute.data_type <> 'multi_select' and value.ordinal <> 0)
          or not exists (
            select 1 from public.category_attributes as category_attribute
            where category_attribute.category_id = target_category_id
              and category_attribute.attribute_id = value.attribute_id
          )
          or (
            select count(*) from public.attribute_translations as translation
            where translation.attribute_id = attribute.id
          ) <> 2
          or (
            attribute.group_id is not null and not exists (
              select 1 from public.attribute_groups as attribute_group
              where attribute_group.id = attribute.group_id
                and attribute_group.is_active
                and (
                  select count(*) from public.attribute_group_translations as translation
                  where translation.group_id = attribute_group.id
                ) = 2
            )
          )
          or (
            attribute.data_type in ('single_select', 'multi_select') and not exists (
              select 1 from public.attribute_options as option
              where option.id = value.option_id and option.is_active
                and (
                  select count(*) from public.attribute_option_translations as translation
                  where translation.option_id = option.id
                ) = 2
            )
          )
        )
    ) then
      raise exception 'Published product has incomplete attribute metadata';
    end if;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_category_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  perform private.assert_category_publishable(coalesce(new.id, old.id));
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_product_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  perform private.assert_product_publishable(coalesce(new.id, old.id));
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_catalog_publication_dependencies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
declare
  target record;
begin
  for target in select category.id from public.categories as category where category.is_published loop
    perform private.assert_category_publishable(target.id);
  end loop;
  for target in select product.id from public.products as product where product.is_published loop
    perform private.assert_product_publishable(target.id);
  end loop;
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION private.sync_category_slug_route()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  if tg_op = 'DELETE' then
    update public.category_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and category_id = old.category_id and is_current;
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.category_id, new.locale) is distinct from (old.category_id, old.locale) then
    raise exception 'category translation identity is immutable';
  end if;
  if tg_op = 'UPDATE' and new.slug = old.slug then return new; end if;
  if tg_op = 'UPDATE' then
    update public.category_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and category_id = old.category_id and is_current;
  end if;
  insert into public.category_slug_routes (locale, slug, category_id, is_current, retired_at)
  values (new.locale, new.slug, new.category_id, true, null)
  on conflict (locale, slug) do update
  set is_current = true, retired_at = null
  where category_slug_routes.category_id = excluded.category_id;
  if not found then
    raise exception 'category slug is reserved by another category' using errcode = '23505';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.sync_product_slug_route()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  if tg_op = 'DELETE' then
    update public.product_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and product_id = old.product_id and is_current;
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.product_id, new.locale) is distinct from (old.product_id, old.locale) then
    raise exception 'product translation identity is immutable';
  end if;
  if tg_op = 'UPDATE' and new.slug = old.slug then return new; end if;
  if tg_op = 'UPDATE' then
    update public.product_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and product_id = old.product_id and is_current;
  end if;
  insert into public.product_slug_routes (locale, slug, product_id, is_current, retired_at)
  values (new.locale, new.slug, new.product_id, true, null)
  on conflict (locale, slug) do update
  set is_current = true, retired_at = null
  where product_slug_routes.product_id = excluded.product_id;
  if not found then
    raise exception 'product slug is reserved by another product' using errcode = '23505';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.record_lead_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.lead_status_history (lead_id, previous_status, status, changed_by)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.create_lead_telegram_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  insert into public.lead_telegram_deliveries (lead_id) values (new.id);
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.protect_lead_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  if row(
    new.id, new.client_request_id, new.request_hash,
    new.client_fingerprint_hash, new.phone_hash, new.locale, new.source,
    new.source_path, new.name, new.phone, new.telegram_username, new.comment,
    new.consent_at, new.consent_version, new.product_id,
    new.product_name_snapshot, new.product_price_minor,
    new.product_currency, new.product_path_snapshot, new.created_at
  ) is distinct from row(
    old.id, old.client_request_id, old.request_hash,
    old.client_fingerprint_hash, old.phone_hash, old.locale, old.source,
    old.source_path, old.name, old.phone, old.telegram_username, old.comment,
    old.consent_at, old.consent_version, old.product_id,
    old.product_name_snapshot, old.product_price_minor,
    old.product_currency, old.product_path_snapshot, old.created_at
  ) then
    raise exception 'lead fields are immutable' using errcode = '22023';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_category_parent_cycle()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
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

CREATE OR REPLACE FUNCTION private.validate_category_tree_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  if new.is_published and new.parent_id is not null and not exists (
    select 1 from public.categories as parent
    where parent.id = new.parent_id and parent.is_published and parent.archived_at is null
  ) then
    raise exception 'Published child category requires a published parent';
  end if;
  if (not new.is_published or new.archived_at is not null) and exists (
    select 1 from public.categories as child
    where child.parent_id = new.id and child.is_published and child.archived_at is null
  ) then
    raise exception 'Published child categories require an active parent';
  end if;
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION private.validate_attribute_option_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
declare
  target_type public.attribute_data_type;
begin
  select data_type into target_type from public.attributes where id = new.attribute_id;
  if target_type not in ('single_select', 'multi_select') then
    raise exception 'Options require a select attribute';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.protect_attribute_type_with_options()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
begin
  if new.data_type is distinct from old.data_type and exists (
    select 1 from public.attribute_options where attribute_id = new.id
  ) then
    raise exception 'Cannot change the type of an attribute with options';
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION private.enforce_privacy_retention()
RETURNS table (
  deleted_leads bigint,
  deleted_assistant_logs bigint,
  deleted_lead_rate_limits bigint,
  deleted_assistant_rate_limits bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  delete from public.leads where updated_at < now() - interval '24 months';
  get diagnostics deleted_leads = row_count;

  delete from public.assistant_logs where created_at < now() - interval '90 days';
  get diagnostics deleted_assistant_logs = row_count;

  delete from private.lead_rate_limits where expires_at < now();
  get diagnostics deleted_lead_rate_limits = row_count;

  delete from private.assistant_rate_limits where expires_at < now();
  get diagnostics deleted_assistant_rate_limits = row_count;

  return next;
end;
$$;

CREATE OR REPLACE FUNCTION private.catalog_search_normalize(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  select translate(lower(coalesce(p_value, '')), 'ёăâîșțşţ', 'еaaistst');
$$;

CREATE OR REPLACE FUNCTION private.catalog_search_matches(p_haystack text, p_query text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
declare
  haystack text := private.catalog_search_normalize(p_haystack);
  normalized_query text := trim(private.catalog_search_normalize(p_query));
  token text;
  token_count integer := 0;
begin
  if normalized_query = '' then return true; end if;
  for token in
    select distinct candidate.value
    from regexp_split_to_table(normalized_query, '[^0-9a-zа-я]+') as candidate(value)
    where char_length(candidate.value) >= 3
    limit 8
  loop
    token_count := token_count + 1;
    if strpos(haystack, substr(token, 1, greatest(4, least(char_length(token) - 2, 8)))) = 0 then
      return false;
    end if;
  end loop;
  if token_count = 0 then return strpos(haystack, normalized_query) > 0; end if;
  return true;
end;
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- 4. TRIGGERS ON PUBLIC TABLES (EXACT NAMES AND EVENTS MATCHING BENCHMARK)
DROP TRIGGER IF EXISTS set_updated_at ON public.categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.product_images;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.attributes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attributes FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.attribute_groups;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attribute_groups FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.attribute_options;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attribute_options FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.site_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.lead_telegram_deliveries;
DROP TRIGGER IF EXISTS set_lead_telegram_deliveries_updated_at ON public.lead_telegram_deliveries;
CREATE TRIGGER set_lead_telegram_deliveries_updated_at BEFORE UPDATE ON public.lead_telegram_deliveries FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.assistant_knowledge;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.assistant_knowledge FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.category_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.category_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.product_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.product_image_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_image_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.attribute_group_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attribute_group_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.attribute_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attribute_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.attribute_option_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attribute_option_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.product_attribute_values;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_attribute_values FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.product_attribute_value_translations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.product_attribute_value_translations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.user_roles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.category_attributes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.category_attributes FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Slug triggers
DROP TRIGGER IF EXISTS sync_category_slug_route ON public.category_translations;
DROP TRIGGER IF EXISTS sync_category_slug_route_trigger ON public.category_translations;
CREATE TRIGGER sync_category_slug_route AFTER INSERT OR UPDATE OR DELETE ON public.category_translations FOR EACH ROW EXECUTE FUNCTION private.sync_category_slug_route();

DROP TRIGGER IF EXISTS sync_product_slug_route ON public.product_translations;
DROP TRIGGER IF EXISTS sync_product_slug_route_trigger ON public.product_translations;
CREATE TRIGGER sync_product_slug_route AFTER INSERT OR UPDATE OR DELETE ON public.product_translations FOR EACH ROW EXECUTE FUNCTION private.sync_product_slug_route();

-- Validation triggers
DROP TRIGGER IF EXISTS validate_product_attribute_value ON public.product_attribute_values;
DROP TRIGGER IF EXISTS validate_product_attribute_value_trigger ON public.product_attribute_values;
CREATE TRIGGER validate_product_attribute_value BEFORE INSERT OR UPDATE ON public.product_attribute_values FOR EACH ROW EXECUTE FUNCTION private.validate_product_attribute_value();

DROP TRIGGER IF EXISTS validate_category_attribute ON public.category_attributes;
DROP TRIGGER IF EXISTS validate_category_attribute_trigger ON public.category_attributes;
CREATE TRIGGER validate_category_attribute BEFORE INSERT OR UPDATE ON public.category_attributes FOR EACH ROW EXECUTE FUNCTION private.validate_category_attribute();

DROP TRIGGER IF EXISTS validate_attribute_filterability ON public.attributes;
DROP TRIGGER IF EXISTS validate_attribute_filterability_trigger ON public.attributes;
CREATE TRIGGER validate_attribute_filterability BEFORE INSERT OR UPDATE ON public.attributes FOR EACH ROW EXECUTE FUNCTION private.validate_attribute_filterability();

DROP TRIGGER IF EXISTS validate_category_parent_cycle ON public.categories;
DROP TRIGGER IF EXISTS validate_category_parent_cycle_trigger ON public.categories;
CREATE TRIGGER validate_category_parent_cycle BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION private.validate_category_parent_cycle();

DROP TRIGGER IF EXISTS validate_category_tree_publication ON public.categories;
DROP TRIGGER IF EXISTS validate_category_tree_publication_trigger ON public.categories;
CREATE CONSTRAINT TRIGGER validate_category_tree_publication AFTER INSERT OR UPDATE ON public.categories DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.validate_category_tree_publication();

DROP TRIGGER IF EXISTS validate_attribute_option_type ON public.attribute_options;
DROP TRIGGER IF EXISTS validate_attribute_option_type_trigger ON public.attribute_options;
CREATE TRIGGER validate_attribute_option_type BEFORE INSERT OR UPDATE ON public.attribute_options FOR EACH ROW EXECUTE FUNCTION private.validate_attribute_option_type();

DROP TRIGGER IF EXISTS protect_attribute_type_with_options ON public.attributes;
DROP TRIGGER IF EXISTS protect_attribute_type_with_options_trigger ON public.attributes;
CREATE TRIGGER protect_attribute_type_with_options BEFORE UPDATE ON public.attributes FOR EACH ROW EXECUTE FUNCTION private.protect_attribute_type_with_options();

DROP TRIGGER IF EXISTS protect_lead_fields ON public.leads;
DROP TRIGGER IF EXISTS protect_lead_fields_trigger ON public.leads;
CREATE TRIGGER protect_lead_fields BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION private.protect_lead_fields();

DROP TRIGGER IF EXISTS create_lead_telegram_delivery ON public.leads;
DROP TRIGGER IF EXISTS create_lead_telegram_delivery_trigger ON public.leads;
CREATE TRIGGER create_lead_telegram_delivery AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION private.create_lead_telegram_delivery();

DROP TRIGGER IF EXISTS record_lead_status ON public.leads;
DROP TRIGGER IF EXISTS record_lead_status_trigger ON public.leads;
CREATE TRIGGER record_lead_status AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION private.record_lead_status();

-- Publication dependencies constraint triggers on publication-related tables
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN SELECT unnest(ARRAY[
    'category_translations', 'product_translations',
    'product_images', 'product_image_translations', 'attribute_groups',
    'attribute_group_translations', 'attributes', 'attribute_translations',
    'attribute_options', 'attribute_option_translations', 'category_attributes',
    'product_attribute_values', 'product_attribute_value_translations'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS validate_catalog_publication_dependencies ON public.%I', tbl_name);
    EXECUTE format(
      'CREATE CONSTRAINT TRIGGER validate_catalog_publication_dependencies AFTER INSERT OR UPDATE OR DELETE ON public.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.validate_catalog_publication_dependencies()',
      tbl_name
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS validate_category_publication ON public.categories;
CREATE CONSTRAINT TRIGGER validate_category_publication AFTER INSERT OR UPDATE ON public.categories DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.validate_category_publication();

DROP TRIGGER IF EXISTS validate_product_publication ON public.products;
CREATE CONSTRAINT TRIGGER validate_product_publication AFTER INSERT OR UPDATE ON public.products DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.validate_product_publication();

-- 5. ENABLE RLS ON PUBLIC AND PRIVATE TABLES (ENABLE RLS ONLY, NO FORCE RLS)
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN SELECT unnest(ARRAY[
    'profiles', 'user_roles', 'categories', 'category_translations',
    'products', 'product_translations', 'product_images',
    'product_image_translations', 'attribute_groups',
    'attribute_group_translations', 'attributes', 'attribute_translations',
    'attribute_options', 'attribute_option_translations',
    'category_attributes', 'product_attribute_values',
    'product_attribute_value_translations', 'site_settings',
    'category_slug_routes', 'product_slug_routes',
    'leads', 'lead_status_history', 'lead_telegram_deliveries', 'lead_delivery_attempts',
    'assistant_logs', 'assistant_knowledge', 'product_views'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', tbl_name);
  END LOOP;
END;
$$;

ALTER TABLE private.lead_rate_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE private.assistant_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.assistant_rate_limits NO FORCE ROW LEVEL SECURITY;

-- RLS POLICIES (EXACT VERBATIM FROM MIGRATIONS)

-- Initial schema 18 tables: admin_all for ALL to authenticated
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN SELECT unnest(ARRAY[
    'profiles', 'user_roles', 'categories', 'category_translations',
    'products', 'product_translations', 'product_images',
    'product_image_translations', 'attribute_groups',
    'attribute_group_translations', 'attributes', 'attribute_translations',
    'attribute_options', 'attribute_option_translations',
    'category_attributes', 'product_attribute_values',
    'product_attribute_value_translations', 'site_settings'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all ON public.%I', tbl_name);
    EXECUTE format(
      'CREATE POLICY admin_all ON public.%I FOR ALL TO authenticated USING ((select private.is_admin())) WITH CHECK ((select private.is_admin()))',
      tbl_name
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS own_role_select ON public.user_roles;
CREATE POLICY own_role_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS own_profile_select ON public.profiles;
CREATE POLICY own_profile_select ON public.profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));

DROP POLICY IF EXISTS own_profile_update ON public.profiles;

-- Stage 4 SEO: admin_all for SELECT to authenticated
DROP POLICY IF EXISTS admin_all ON public.category_slug_routes;
CREATE POLICY admin_all ON public.category_slug_routes FOR SELECT TO authenticated USING ((select private.is_admin()));

DROP POLICY IF EXISTS admin_all ON public.product_slug_routes;
CREATE POLICY admin_all ON public.product_slug_routes FOR SELECT TO authenticated USING ((select private.is_admin()));

-- Stage 5 Leads: admin_all for ALL on leads, SELECT on status_history, telegram_deliveries, delivery_attempts
DROP POLICY IF EXISTS admin_all ON public.leads;
CREATE POLICY admin_all ON public.leads FOR ALL TO authenticated USING ((select private.is_admin())) WITH CHECK ((select private.is_admin()));

DROP POLICY IF EXISTS admin_all ON public.lead_status_history;
CREATE POLICY admin_all ON public.lead_status_history FOR SELECT TO authenticated USING ((select private.is_admin()));

DROP POLICY IF EXISTS admin_all ON public.lead_telegram_deliveries;
CREATE POLICY admin_all ON public.lead_telegram_deliveries FOR SELECT TO authenticated USING ((select private.is_admin()));

DROP POLICY IF EXISTS admin_all ON public.lead_delivery_attempts;
CREATE POLICY admin_all ON public.lead_delivery_attempts FOR SELECT TO authenticated USING ((select private.is_admin()));

-- Stage 7 Assistant: admin_all for ALL on assistant_knowledge, SELECT on assistant_logs
DROP POLICY IF EXISTS admin_all ON public.assistant_knowledge;
CREATE POLICY admin_all ON public.assistant_knowledge FOR ALL TO authenticated USING ((select private.is_admin())) WITH CHECK ((select private.is_admin()));

DROP POLICY IF EXISTS admin_all ON public.assistant_logs;
CREATE POLICY admin_all ON public.assistant_logs FOR SELECT TO authenticated USING ((select private.is_admin()));

-- Auto popular products: policy "Admins can view product views"
DROP POLICY IF EXISTS "popular_products_select" ON public.product_views;
DROP POLICY IF EXISTS "Admins can view product views" ON public.product_views;
CREATE POLICY "Admins can view product views" ON public.product_views FOR SELECT TO authenticated USING ((select private.is_admin()));

-- STORAGE RLS POLICIES (VERBATIM FROM INITIAL MIGRATION & STAGE 6/7)
DROP POLICY IF EXISTS product_images_admin_select ON storage.objects;
CREATE POLICY product_images_admin_select ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND (select private.is_admin()));

DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
CREATE POLICY product_images_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (select private.is_admin())
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$'
  AND EXISTS (
    SELECT 1 FROM public.products AS product
    WHERE product.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND (select private.is_admin()));

DROP POLICY IF EXISTS category_images_admin_select ON storage.objects;
CREATE POLICY category_images_admin_select ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'category-images' AND (select private.is_admin()));

DROP POLICY IF EXISTS category_images_admin_insert ON storage.objects;
CREATE POLICY category_images_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'category-images'
  AND (select private.is_admin())
  AND name ~ '^categories/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$'
);

DROP POLICY IF EXISTS category_images_admin_delete ON storage.objects;
CREATE POLICY category_images_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'category-images' AND (select private.is_admin()));

-- 6. BUCKET DEFINITIONS IN STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 7. TABLE GRANTS & DEFAULT PRIVILEGES (VERBATIM FROM INITIAL SCHEMA & STAGE MIGRATIONS)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.categories, public.category_translations, public.products,
  public.product_translations, public.product_images,
  public.product_image_translations, public.attribute_groups,
  public.attribute_group_translations, public.attributes,
  public.attribute_translations, public.attribute_options,
  public.attribute_option_translations, public.category_attributes,
  public.product_attribute_values,
  public.product_attribute_value_translations, public.site_settings,
  public.category_slug_routes, public.product_slug_routes,
  public.assistant_knowledge
TO anon, authenticated;

GRANT SELECT ON TABLE public.profiles, public.user_roles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.profiles, public.user_roles, public.categories,
  public.category_translations, public.products, public.product_translations,
  public.product_images, public.product_image_translations,
  public.attribute_groups, public.attribute_group_translations,
  public.attributes, public.attribute_translations, public.attribute_options,
  public.attribute_option_translations, public.category_attributes,
  public.product_attribute_values,
  public.product_attribute_value_translations, public.site_settings,
  public.category_slug_routes, public.product_slug_routes,
  public.assistant_knowledge
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM public, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM public, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM public, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON FUNCTIONS FROM public, anon, authenticated, service_role;

COMMIT;
