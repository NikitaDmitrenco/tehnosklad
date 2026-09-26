-- Catalog filters computed in Postgres instead of in Node.
--
-- The facets were built by loading every published product with all of its
-- attribute values into the application and folding them there, so a page of
-- nine products read the whole catalog. That cost grew with the shop until the
-- read stopped succeeding at all, and it silently lost values once a response
-- hit PostgREST's row ceiling. This RPC returns the finished filter document,
-- so the page reads a few kilobytes whatever the catalog's size.
--
-- SECURITY INVOKER on purpose: the filters must describe exactly the products
-- the caller may read, so RLS decides visibility here as it does for the rows
-- themselves. `search_public_catalog_product_ids` is SECURITY DEFINER and can
-- name a product the public role cannot then read; this function cannot.
--
-- Filter values mirror `search_public_catalog_product_ids` expression for
-- expression -- a filter that the catalog offers has to be one the search
-- understands. Display values mirror src/features/catalog/supabase/mapper.ts.
-- Ordering of brands and of each attribute's options is left to the caller,
-- which sorts them the way JavaScript does, independent of database collation.

create or replace function public.get_public_catalog_facets(
  p_locale public.app_locale,
  p_category_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with visible as (
    select
      product.id,
      product.brand,
      product.availability,
      product.price_minor,
      product.category_id
    from public.products as product
    where product.is_published
      and product.archived_at is null
      and (p_category_id is null or product.category_id = p_category_id)
  ), value_row as (
    select
      attribute.code,
      attribute.data_type,
      attribute_translation.name as label,
      coalesce(
        category_attribute.is_filterable, attribute.is_filterable
      ) as is_filterable,
      coalesce(attribute_group.sort_order, 0) * 1000000
        + coalesce(category_attribute.sort_order, 0) * 1000 as sort_order,
      case attribute.data_type
        when 'text' then value.text_value_key
        when 'number' then case
          when strpos(value.number_value::text, '.') > 0
            then trim(trailing '.' from trim(
              trailing '0' from value.number_value::text
            ))
          else value.number_value::text
        end
        when 'boolean' then value.boolean_value::text
        when 'single_select' then option.code
        when 'multi_select' then option.code
        when 'color' then lower(value.color_value)
      end as filter_value,
      case attribute.data_type
        when 'text' then value_translation.text_value
        when 'number' then case
          when strpos(value.number_value::text, '.') > 0
            then trim(trailing '.' from trim(
              trailing '0' from value.number_value::text
            ))
          else value.number_value::text
        end || coalesce(' ' || attribute_translation.unit_label, '')
        when 'boolean' then case
          when value.boolean_value
            then case when p_locale = 'ru' then 'Да' else 'Da' end
          else case when p_locale = 'ru' then 'Нет' else 'Nu' end
        end
        when 'single_select' then option_translation.label
        when 'multi_select' then option_translation.label
        when 'color' then value.color_value
      end as display_value
    from public.product_attribute_values as value
    join visible on visible.id = value.product_id
    -- Active-only, explicitly: RLS hides a deactivated attribute or option
    -- from the public role, but service_role is not subject to it and must not
    -- see a different set of filters.
    join public.attributes as attribute
      on attribute.id = value.attribute_id and attribute.is_active
    join public.attribute_translations as attribute_translation
      on attribute_translation.attribute_id = attribute.id
      and attribute_translation.locale = p_locale
    left join public.category_attributes as category_attribute
      on category_attribute.category_id = visible.category_id
      and category_attribute.attribute_id = attribute.id
    left join public.attribute_groups as attribute_group
      on attribute_group.id = attribute.group_id and attribute_group.is_active
    left join public.attribute_options as option
      on option.id = value.option_id and option.is_active
    left join public.attribute_option_translations as option_translation
      on option_translation.option_id = option.id
      and option_translation.locale = p_locale
    left join public.product_attribute_value_translations as value_translation
      on value_translation.value_id = value.id
      and value_translation.locale = p_locale
  ), filterable as (
    -- A value whose option or translation is hidden from the caller is left
    -- out of the filters rather than offered with a missing label.
    select distinct
      code, data_type, label, sort_order, filter_value, display_value
    from value_row
    where is_filterable
      and filter_value is not null
      and display_value is not null
  ), attribute_facet as (
    select
      code,
      data_type,
      label,
      min(sort_order) as sort_order,
      jsonb_agg(
        jsonb_build_object('value', filter_value, 'label', display_value)
      ) as options
    from filterable
    group by code, data_type, label
  )
  select jsonb_build_object(
    'brands', coalesce(
      (select jsonb_agg(distinct visible.brand) from visible), '[]'::jsonb
    ),
    'availability', coalesce(
      (select jsonb_agg(distinct visible.availability::text) from visible),
      '[]'::jsonb
    ),
    'min_price_minor', (select min(visible.price_minor) from visible),
    'max_price_minor', (select max(visible.price_minor) from visible),
    'attributes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', attribute_facet.code,
          'data_type', attribute_facet.data_type,
          'label', attribute_facet.label,
          'options', attribute_facet.options
        )
        order by attribute_facet.sort_order, attribute_facet.code
      )
      from attribute_facet
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_public_catalog_facets(
  public.app_locale, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.get_public_catalog_facets(
  public.app_locale, uuid
) to anon, authenticated, service_role;
