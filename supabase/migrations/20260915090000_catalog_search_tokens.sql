-- Token-aware catalog search.
--
-- The previous predicate matched the whole query string as one substring of
-- name/brand/model/sku, so a natural-language question ("какие холодильники
-- есть в наличии") never matched a product named "Samsung RB34T602FSA".
-- Matching is now per token over a haystack that also covers the localized
-- category name. Token matching is a superset of the previous
-- contiguous-substring behaviour, so no existing result is lost. Descriptions
-- stay out of the haystack: their marketing boilerplate repeats on every
-- product and would match questions about warranty or delivery. The
-- TypeScript mirror lives in `src/features/catalog/search-text.ts`.

create or replace function private.catalog_search_normalize(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(coalesce(p_value, '')), 'ёăâîșțşţ', 'еaaistst');
$$;

create or replace function private.catalog_search_matches(
  p_haystack text,
  p_query text
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  haystack text := private.catalog_search_normalize(p_haystack);
  normalized_query text := trim(private.catalog_search_normalize(p_query));
  token text;
  token_count integer := 0;
begin
  if normalized_query = '' then
    return true;
  end if;
  for token in
    select distinct candidate.value
    from regexp_split_to_table(normalized_query, '[^0-9a-zа-я]+') as candidate(value)
    where char_length(candidate.value) >= 3
    limit 8
  loop
    token_count := token_count + 1;
    -- Inflection-tolerant prefix: "холодильники" still matches "холодильник".
    if strpos(
      haystack,
      substr(token, 1, greatest(4, least(char_length(token) - 2, 8)))
    ) = 0 then
      return false;
    end if;
  end loop;
  -- A query without usable tokens keeps the historical substring behaviour.
  if token_count = 0 then
    return strpos(haystack, normalized_query) > 0;
  end if;
  return true;
end;
$$;

revoke all on function private.catalog_search_normalize(text) from public;
revoke all on function private.catalog_search_matches(text, text) from public;

create or replace function public.search_public_catalog_product_ids(
  p_locale public.app_locale,
  p_category_id uuid default null,
  p_query text default null,
  p_brand text default null,
  p_availability public.availability_status default null,
  p_min_price_minor bigint default null,
  p_max_price_minor bigint default null,
  p_attributes jsonb default '{}'::jsonb,
  p_sort text default 'popular',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table(product_id uuid, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_query is not null and char_length(p_query) > 100
    or p_brand is not null and char_length(p_brand) > 120
    or p_min_price_minor is not null and p_min_price_minor < 0
    or p_max_price_minor is not null and p_max_price_minor < 0
    or p_min_price_minor is not null and p_max_price_minor is not null
      and p_min_price_minor > p_max_price_minor
    or p_sort not in ('popular', 'new', 'price_asc', 'price_desc', 'name')
    or p_limit < 1 or p_limit > 100 or p_offset < 0
    or jsonb_typeof(p_attributes) <> 'object'
    or (select count(*) from jsonb_object_keys(p_attributes)) > 20
    or exists (
      select 1 from jsonb_each_text(p_attributes) as requested(code, value)
      where requested.code !~ '^[a-z][a-z0-9_]*$'
        or char_length(requested.value) > 160
    )
  then
    raise exception 'invalid catalog search parameters'
      using errcode = '22023';
  end if;

  return query
  with filtered as materialized (
    select
      product.id,
      product.is_new,
      product.price_minor,
      product.sort_order,
      translation.name,
      coalesce(v_counts.view_count, 0) as views_30d
    from public.products as product
    join public.product_translations as translation
      on translation.product_id = product.id and translation.locale = p_locale
    left join public.category_translations as category_translation
      on category_translation.category_id = product.category_id
      and category_translation.locale = p_locale
    left join (
      select v.product_id, count(v.id) as view_count
      from public.product_views v
      where v.viewed_at >= (now() - interval '30 days')
      group by v.product_id
    ) as v_counts on v_counts.product_id = product.id
    where product.is_published and product.archived_at is null
      and (p_category_id is null or product.category_id = p_category_id)
      and (p_brand is null or product.brand = p_brand)
      and (p_availability is null or product.availability = p_availability)
      and (p_min_price_minor is null or product.price_minor >= p_min_price_minor)
      and (p_max_price_minor is null or product.price_minor <= p_max_price_minor)
      and (
        p_query is null or private.catalog_search_matches(
          concat_ws(
            ' ',
            translation.name,
            product.brand,
            product.model,
            product.sku,
            category_translation.name
          ),
          p_query
        )
      )
      and not exists (
        select 1 from jsonb_each_text(p_attributes) as requested(code, value)
        where not exists (
          select 1
          from public.product_attribute_values as attribute_value
          join public.attributes as attribute
            on attribute.id = attribute_value.attribute_id
          left join public.attribute_options as attribute_option
            on attribute_option.id = attribute_value.option_id
          where attribute_value.product_id = product.id
            and attribute.code = requested.code
            and case attribute.data_type
              when 'text' then attribute_value.text_value_key
              when 'number' then case
                when strpos(attribute_value.number_value::text, '.') > 0
                  then trim(trailing '.' from trim(
                    trailing '0' from attribute_value.number_value::text
                  ))
                else attribute_value.number_value::text
              end
              when 'boolean' then attribute_value.boolean_value::text
              when 'single_select' then attribute_option.code
              when 'multi_select' then attribute_option.code
              when 'color' then lower(attribute_value.color_value)
            end = requested.value
        )
      )
  ), totals as (
    select count(*)::bigint as total_count from filtered
  )
  select page.id, totals.total_count
  from totals
  left join lateral (
    select filtered.id
    from filtered
    order by
      case when p_sort = 'popular' then filtered.views_30d end desc,
      case when p_sort = 'new' then filtered.is_new end desc,
      case when p_sort = 'price_asc' then filtered.price_minor end asc,
      case when p_sort = 'price_desc' then filtered.price_minor end desc,
      case when p_sort in ('popular', 'new') then filtered.sort_order end asc,
      case when p_sort in ('popular', 'new', 'name') then lower(filtered.name) end asc,
      filtered.id asc
    limit p_limit offset p_offset
  ) as page on true;
end;
$$;

grant execute on function public.search_public_catalog_product_ids(
  public.app_locale, uuid, text, text, public.availability_status, bigint, bigint, jsonb, text, integer, integer
) to anon, authenticated;
