-- Tehnosklad Stage 4: server catalog search and canonical slug history.

create table public.category_slug_routes (
  locale public.app_locale not null,
  slug text not null check (
    char_length(slug) between 1 and 180
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  category_id uuid not null references public.categories (id) on delete restrict,
  is_current boolean not null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  primary key (locale, slug),
  check (is_current = (retired_at is null))
);

create table public.product_slug_routes (
  locale public.app_locale not null,
  slug text not null check (
    char_length(slug) between 1 and 220
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  product_id uuid not null references public.products (id) on delete restrict,
  is_current boolean not null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  primary key (locale, slug),
  check (is_current = (retired_at is null))
);

create unique index category_slug_routes_current_idx
  on public.category_slug_routes (category_id, locale) where is_current;
create index category_slug_routes_entity_idx
  on public.category_slug_routes (category_id, locale);
create unique index product_slug_routes_current_idx
  on public.product_slug_routes (product_id, locale) where is_current;
create index product_slug_routes_entity_idx
  on public.product_slug_routes (product_id, locale);

insert into public.category_slug_routes (locale, slug, category_id, is_current)
select locale, slug, category_id, true from public.category_translations;

insert into public.product_slug_routes (locale, slug, product_id, is_current)
select locale, slug, product_id, true from public.product_translations;

create function private.sync_category_slug_route()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.category_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and category_id = old.category_id and is_current;
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.category_id, new.locale)
      is distinct from (old.category_id, old.locale) then
    raise exception 'category translation identity is immutable';
  end if;
  if tg_op = 'UPDATE' and new.slug = old.slug then return new; end if;
  if tg_op = 'UPDATE' then
    update public.category_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and category_id = old.category_id and is_current;
  end if;
  insert into public.category_slug_routes (
    locale, slug, category_id, is_current, retired_at
  ) values (new.locale, new.slug, new.category_id, true, null)
  on conflict (locale, slug) do update
  set is_current = true, retired_at = null
  where category_slug_routes.category_id = excluded.category_id;
  if not found then
    raise exception 'category slug is reserved by another category'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create function private.sync_product_slug_route()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.product_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and product_id = old.product_id and is_current;
    return old;
  end if;
  if tg_op = 'UPDATE' and (new.product_id, new.locale)
      is distinct from (old.product_id, old.locale) then
    raise exception 'product translation identity is immutable';
  end if;
  if tg_op = 'UPDATE' and new.slug = old.slug then return new; end if;
  if tg_op = 'UPDATE' then
    update public.product_slug_routes
    set is_current = false, retired_at = now()
    where locale = old.locale and slug = old.slug
      and product_id = old.product_id and is_current;
  end if;
  insert into public.product_slug_routes (
    locale, slug, product_id, is_current, retired_at
  ) values (new.locale, new.slug, new.product_id, true, null)
  on conflict (locale, slug) do update
  set is_current = true, retired_at = null
  where product_slug_routes.product_id = excluded.product_id;
  if not found then
    raise exception 'product slug is reserved by another product'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger sync_category_slug_route
after insert or update or delete on public.category_translations
for each row execute function private.sync_category_slug_route();

create trigger sync_product_slug_route
after insert or update or delete on public.product_translations
for each row execute function private.sync_product_slug_route();

create function public.search_public_catalog_product_ids(
  p_locale public.app_locale,
  p_category_id uuid default null,
  p_query text default null,
  p_brand text default null,
  p_availability public.availability_status default null,
  p_min_price_minor bigint default null,
  p_max_price_minor bigint default null,
  p_attributes jsonb default '{}'::jsonb,
  p_sort text default 'popular',
  p_limit integer default 9,
  p_offset integer default 0
)
returns table (product_id uuid, total_count bigint)
language plpgsql
stable
security invoker
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
    select product.id, product.is_popular, product.is_new,
      product.price_minor, product.sort_order, translation.name
    from public.products as product
    join public.product_translations as translation
      on translation.product_id = product.id and translation.locale = p_locale
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
      case when p_sort = 'popular' then filtered.is_popular end desc,
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

alter table public.category_slug_routes enable row level security;
alter table public.product_slug_routes enable row level security;

create policy public_category_slug_history_select
on public.category_slug_routes for select to anon, authenticated
using (not is_current and exists (
  select 1 from public.categories as category
  where category.id = category_id
    and category.is_published and category.archived_at is null
));

create policy public_product_slug_history_select
on public.product_slug_routes for select to anon, authenticated
using (not is_current and exists (
  select 1 from public.products as product
  join public.categories as category on category.id = product.category_id
  where product.id = product_id
    and product.is_published and product.archived_at is null
    and category.is_published and category.archived_at is null
));

create policy admin_all on public.category_slug_routes
for select to authenticated using ((select private.is_admin()));
create policy admin_all on public.product_slug_routes
for select to authenticated using ((select private.is_admin()));

revoke all on table public.category_slug_routes, public.product_slug_routes
  from anon, authenticated, service_role;
grant select on table public.category_slug_routes, public.product_slug_routes
  to anon, authenticated;
grant select, insert, update, delete on table
  public.category_slug_routes, public.product_slug_routes to service_role;

revoke all on function private.sync_category_slug_route()
  from public, anon, authenticated, service_role;
revoke all on function private.sync_product_slug_route()
  from public, anon, authenticated, service_role;
revoke all on function public.search_public_catalog_product_ids(
  public.app_locale, uuid, text, text, public.availability_status,
  bigint, bigint, jsonb, text, integer, integer
) from public, anon, authenticated, service_role;
grant execute on function public.search_public_catalog_product_ids(
  public.app_locale, uuid, text, text, public.availability_status,
  bigint, bigint, jsonb, text, integer, integer
) to anon, authenticated, service_role;
