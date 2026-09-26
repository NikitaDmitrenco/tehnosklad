-- Auto Popular Products by 30-Day Views Migration

-- 1. Create product_views table
create table public.product_views (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

-- 2. Indexes for 30-day view aggregation and lifecycle cleanup
create index idx_product_views_30d on public.product_views (product_id, viewed_at desc);
create index idx_product_views_viewed_at on public.product_views (viewed_at);

-- 3. Row Level Security for product_views
alter table public.product_views enable row level security;

create policy "Admins can view product views"
  on public.product_views for select
  to authenticated
  using ((select private.is_admin()));

-- 4. RPC to record a product page view (published and non-archived products only)
create or replace function public.record_product_view(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.products
    where id = p_product_id
      and is_published = true
      and archived_at is null
  ) then
    insert into public.product_views (product_id, viewed_at)
    values (p_product_id, now());
  end if;
end;
$$;

grant execute on function public.record_product_view(uuid) to anon, authenticated;

-- 5. RPC to get TOP popular product IDs by 30-day views (capped at 7 max)
create or replace function public.get_popular_products_30d(p_limit integer default 7)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.products p
  join public.product_views v on v.product_id = p.id
  where p.is_published = true
    and p.archived_at is null
    and v.viewed_at >= (now() - interval '30 days')
  group by p.id
  having count(v.id) > 0
  order by count(v.id) desc, p.id asc
  limit least(coalesce(p_limit, 7), 7);
$$;

grant execute on function public.get_popular_products_30d(integer) to anon, authenticated;

-- 6. RPC to cleanup old product views beyond retention window (default 31 days)
create or replace function public.cleanup_old_product_views(p_retention_days integer default 31)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.product_views
  where viewed_at < (now() - (coalesce(p_retention_days, 31) || ' days')::interval);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- 7. Drop legacy manual is_popular column from products table
alter table public.products drop column if exists is_popular;

-- 8. Recreate admin_save_product RPC without p_is_popular parameter
create or replace function public.admin_save_product(
  p_id uuid,
  p_category_id uuid,
  p_brand text,
  p_model text,
  p_sku text,
  p_price_minor bigint,
  p_old_price_minor bigint,
  p_availability public.availability_status,
  p_quantity integer,
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
    availability, quantity, is_new, is_published, sort_order
  ) values (
    target_id, p_category_id, p_brand, p_model, p_sku, p_price_minor,
    p_old_price_minor, p_availability, p_quantity, p_is_new,
    p_is_published, p_sort_order
  ) on conflict (id) do update set
    category_id = excluded.category_id,
    brand = excluded.brand,
    model = excluded.model,
    sku = excluded.sku,
    price_minor = excluded.price_minor,
    old_price_minor = excluded.old_price_minor,
    availability = excluded.availability,
    quantity = excluded.quantity,
    is_new = excluded.is_new,
    is_published = excluded.is_published,
    sort_order = excluded.sort_order;
  if not found then raise exception 'product_not_found' using errcode = 'P0002'; end if;

  insert into public.product_translations (
    product_id, locale, name, slug, short_description, description, seo_title, seo_description
  ) values (
    target_id, 'ru', p_ru->>'name', p_ru->>'slug', p_ru->>'shortDescription',
    p_ru->>'description', p_ru->>'seoTitle', p_ru->>'seoDescription'
  ), (
    target_id, 'ro', p_ro->>'name', p_ro->>'slug', p_ro->>'shortDescription',
    p_ro->>'description', p_ro->>'seoTitle', p_ro->>'seoDescription'
  ) on conflict (product_id, locale) do update set
    name = excluded.name,
    slug = excluded.slug,
    short_description = excluded.short_description,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description;

  return target_id;
end;
$$;

-- 9. Recreate search_public_catalog_product_ids RPC without legacy product.is_popular column
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
        p_query is null or strpos(
          lower(concat_ws(' ', translation.name, product.brand, product.model, product.sku)),
          lower(trim(p_query))
        ) > 0
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
