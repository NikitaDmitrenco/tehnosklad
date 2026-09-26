-- Tehnosklad Stage 3 production schema.
-- Source of truth: this migration and later files in supabase/migrations.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.app_locale as enum ('ru', 'ro');
create type public.app_role as enum ('admin');
create type public.availability_status as enum (
  'in_stock',
  'out_of_stock',
  'on_order'
);
create type public.attribute_data_type as enum (
  'text',
  'number',
  'boolean',
  'single_select',
  'multi_select',
  'color'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(display_name) between 1 and 120
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  presentation_key text not null default 'generic' check (
    presentation_key in ('fridge', 'stove', 'vacuum', 'generic')
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id),
  check (not is_published or archived_at is null)
);

create table public.category_translations (
  category_id uuid not null references public.categories (id) on delete cascade,
  locale public.app_locale not null,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null check (
    char_length(slug) between 1 and 180
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  short_description text not null check (char_length(short_description) between 1 and 280),
  description text not null check (char_length(description) between 1 and 5000),
  seo_title text check (seo_title is null or char_length(seo_title) <= 180),
  seo_description text check (
    seo_description is null or char_length(seo_description) <= 320
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_id, locale),
  unique (locale, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  brand text not null check (char_length(brand) between 1 and 120),
  model text not null check (char_length(model) between 1 and 160),
  sku text not null unique check (char_length(sku) between 1 and 80),
  price_minor bigint not null check (price_minor >= 0),
  old_price_minor bigint check (
    old_price_minor is null or old_price_minor > price_minor
  ),
  currency char(3) not null default 'MDL' check (currency = 'MDL'),
  availability public.availability_status not null default 'in_stock',
  quantity integer check (quantity is null or quantity >= 0),
  is_popular boolean not null default false,
  is_new boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_published or archived_at is null)
);

create table public.product_translations (
  product_id uuid not null references public.products (id) on delete cascade,
  locale public.app_locale not null,
  name text not null check (char_length(name) between 1 and 240),
  slug text not null check (
    char_length(slug) between 1 and 220
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  short_description text not null check (char_length(short_description) between 1 and 500),
  description text not null check (char_length(description) between 1 and 10000),
  seo_title text check (seo_title is null or char_length(seo_title) <= 180),
  seo_description text check (
    seo_description is null or char_length(seo_description) <= 320
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, locale),
  unique (locale, slug)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$'
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = product_id::text)
);

create table public.product_image_translations (
  image_id uuid not null references public.product_images (id) on delete cascade,
  locale public.app_locale not null,
  alt_text text not null check (char_length(alt_text) between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (image_id, locale)
);

create unique index product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary;

create table public.attribute_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attribute_group_translations (
  group_id uuid not null references public.attribute_groups (id) on delete cascade,
  locale public.app_locale not null,
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, locale)
);

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.attribute_groups (id) on delete set null,
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  data_type public.attribute_data_type not null,
  unit_code text check (
    unit_code is null or unit_code ~ '^[a-z][a-z0-9_]*$'
  ),
  is_filterable boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (data_type <> 'text' or not is_filterable)
);

create table public.attribute_translations (
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  locale public.app_locale not null,
  name text not null check (char_length(name) between 1 and 160),
  help_text text check (help_text is null or char_length(help_text) <= 500),
  unit_label text check (unit_label is null or char_length(unit_label) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attribute_id, locale)
);

create table public.attribute_options (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_]*$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attribute_id, code),
  unique (id, attribute_id)
);

create table public.attribute_option_translations (
  option_id uuid not null references public.attribute_options (id) on delete cascade,
  locale public.app_locale not null,
  label text not null check (char_length(label) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (option_id, locale)
);

create table public.category_attributes (
  category_id uuid not null references public.categories (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete restrict,
  is_required boolean not null default false,
  is_filterable boolean,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_id, attribute_id)
);

create table public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete restrict,
  ordinal integer not null default 0 check (ordinal >= 0),
  text_value_key text,
  number_value numeric(18, 4),
  boolean_value boolean,
  option_id uuid,
  color_value text check (
    color_value is null or color_value ~ '^#[0-9A-Fa-f]{6}$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, attribute_id, ordinal),
  foreign key (option_id, attribute_id)
    references public.attribute_options (id, attribute_id) on delete restrict,
  check (
    (text_value_key is not null)::integer
    + (number_value is not null)::integer
    + (boolean_value is not null)::integer
    + (option_id is not null)::integer
    + (color_value is not null)::integer = 1
  )
);

create table public.product_attribute_value_translations (
  value_id uuid not null references public.product_attribute_values (id) on delete cascade,
  locale public.app_locale not null,
  text_value text not null check (char_length(text_value) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (value_id, locale)
);

create table public.site_settings (
  key text not null check (
    key in (
      'phone_display', 'phone_href', 'address', 'open_days',
      'open_time', 'closed_day', 'contact_text'
    )
  ),
  locale public.app_locale not null,
  value text not null check (char_length(value) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.user_roles as user_role
    join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = (select auth.uid())
      and user_role.role = 'admin'::public.app_role
      and profile.is_active
  );
$$;

create or replace function private.validate_product_attribute_value()
returns trigger
language plpgsql
set search_path = ''
as $$
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

create or replace function private.validate_category_attribute()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  attribute_type public.attribute_data_type;
  default_filterable boolean;
begin
  select attribute.data_type, attribute.is_filterable
    into attribute_type, default_filterable
  from public.attributes as attribute
  where attribute.id = new.attribute_id;

  if attribute_type = 'text'
    and coalesce(new.is_filterable, default_filterable)
  then
    raise exception 'Text attributes cannot be used as canonical filters';
  end if;
  return new;
end;
$$;

create or replace function private.validate_attribute_filterability()
returns trigger
language plpgsql
set search_path = ''
as $$
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

create or replace function private.assert_category_publishable(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
      and (
        category.id is null or not category.is_published
        or category.archived_at is not null
      )
  ) then
    raise exception 'Published products require a published category';
  end if;
end;
$$;

create or replace function private.assert_product_publishable(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
            or (
              attribute.data_type in ('single_select', 'multi_select')
              and value.option_id is not null
            )
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

create or replace function private.validate_category_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_category_publishable(coalesce(new.id, old.id));
  return null;
end;
$$;

create or replace function private.validate_product_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_product_publishable(coalesce(new.id, old.id));
  return null;
end;
$$;

create or replace function private.validate_catalog_publication_dependencies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  for target in select category.id from public.categories as category
    where category.is_published
  loop
    perform private.assert_category_publishable(target.id);
  end loop;
  for target in select product.id from public.products as product
    where product.is_published
  loop
    perform private.assert_product_publishable(target.id);
  end loop;
  return null;
end;
$$;

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
    'product_attribute_value_translations', 'site_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create trigger validate_product_attribute_value
before insert or update on public.product_attribute_values
for each row execute function private.validate_product_attribute_value();

create trigger validate_category_attribute
before insert or update on public.category_attributes
for each row execute function private.validate_category_attribute();

create trigger validate_attribute_filterability
before insert or update on public.attributes
for each row execute function private.validate_attribute_filterability();

create constraint trigger validate_category_publication
after insert or update on public.categories
deferrable initially deferred
for each row execute function private.validate_category_publication();

create constraint trigger validate_product_publication
after insert or update on public.products
deferrable initially deferred
for each row execute function private.validate_product_publication();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'category_translations', 'product_translations', 'product_images',
    'product_image_translations', 'attribute_groups',
    'attribute_group_translations', 'attributes', 'attribute_translations',
    'attribute_options', 'attribute_option_translations',
    'category_attributes', 'product_attribute_values',
    'product_attribute_value_translations'
  ] loop
    execute format(
      'create constraint trigger validate_catalog_publication_dependencies after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.validate_catalog_publication_dependencies()',
      table_name
    );
  end loop;
end;
$$;

create index categories_parent_sort_idx
  on public.categories (parent_id, sort_order) where archived_at is null;
create index categories_parent_fk_idx
  on public.categories (parent_id) where parent_id is not null;
create index categories_public_sort_idx
  on public.categories (is_published, sort_order) where archived_at is null;
create index products_category_public_idx
  on public.products (category_id, is_published, sort_order)
  where archived_at is null;
create index products_category_fk_idx on public.products (category_id);
create index products_public_popular_idx
  on public.products (is_popular desc, sort_order)
  where is_published and archived_at is null;
create index products_price_idx on public.products (price_minor);
create index products_availability_idx on public.products (availability);
create index product_images_product_sort_idx
  on public.product_images (product_id, sort_order);
create index attributes_group_sort_idx
  on public.attributes (group_id, sort_order);
create index category_attributes_sort_idx
  on public.category_attributes (category_id, sort_order);
create index category_attributes_attribute_fk_idx
  on public.category_attributes (attribute_id);
create index product_attribute_values_attribute_fk_idx
  on public.product_attribute_values (attribute_id);
create index product_attribute_number_idx
  on public.product_attribute_values (attribute_id, number_value)
  where number_value is not null;
create index product_attribute_option_idx
  on public.product_attribute_values (attribute_id, option_id)
  where option_id is not null;

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
    'product_attribute_value_translations', 'site_settings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.validate_product_attribute_value() from public;
revoke all on function private.validate_category_attribute() from public;
revoke all on function private.validate_attribute_filterability() from public;
revoke all on function private.validate_category_publication() from public;
revoke all on function private.validate_product_publication() from public;
revoke all on function private.assert_category_publishable(uuid) from public;
revoke all on function private.assert_product_publishable(uuid) from public;
revoke all on function private.validate_catalog_publication_dependencies() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create policy public_categories_select on public.categories
for select to anon, authenticated
using (is_published and archived_at is null);

create policy public_category_translations_select on public.category_translations
for select to anon, authenticated
using (exists (
  select 1 from public.categories as category
  where category.id = category_id
    and category.is_published and category.archived_at is null
));

create policy public_products_select on public.products
for select to anon, authenticated
using (
  is_published and archived_at is null and exists (
    select 1 from public.categories as category
    where category.id = category_id
      and category.is_published and category.archived_at is null
  )
);

create policy public_product_translations_select on public.product_translations
for select to anon, authenticated
using (exists (
  select 1 from public.products as product
  where product.id = product_id
    and product.is_published and product.archived_at is null
));

create policy public_product_images_select on public.product_images
for select to anon, authenticated
using (exists (
  select 1 from public.products as product
  where product.id = product_id
    and product.is_published and product.archived_at is null
));

create policy public_product_image_translations_select on public.product_image_translations
for select to anon, authenticated
using (exists (
  select 1 from public.product_images as image
  where image.id = image_id
));

create policy public_category_attributes_select on public.category_attributes
for select to anon, authenticated
using (exists (
  select 1 from public.categories as category
  where category.id = category_id
    and category.is_published and category.archived_at is null
));

create policy public_attributes_select on public.attributes
for select to anon, authenticated
using (is_active and exists (
  select 1 from public.category_attributes as category_attribute
  where category_attribute.attribute_id = id
));

create policy public_attribute_translations_select on public.attribute_translations
for select to anon, authenticated
using (exists (
  select 1 from public.attributes as attribute
  where attribute.id = attribute_id
));

create policy public_attribute_groups_select on public.attribute_groups
for select to anon, authenticated
using (is_active and exists (
  select 1 from public.attributes as attribute
  where attribute.group_id = attribute_groups.id
));

create policy public_attribute_group_translations_select on public.attribute_group_translations
for select to anon, authenticated
using (exists (
  select 1 from public.attribute_groups as attribute_group
  where attribute_group.id = group_id
));

create policy public_attribute_options_select on public.attribute_options
for select to anon, authenticated
using (is_active and exists (
  select 1 from public.attributes as attribute
  where attribute.id = attribute_id
));

create policy public_attribute_option_translations_select on public.attribute_option_translations
for select to anon, authenticated
using (exists (
  select 1 from public.attribute_options as attribute_option
  where attribute_option.id = option_id
));

create policy public_product_attribute_values_select on public.product_attribute_values
for select to anon, authenticated
using (exists (
  select 1 from public.products as product
  where product.id = product_id
    and product.is_published and product.archived_at is null
) and exists (
  select 1 from public.attributes as attribute
  where attribute.id = attribute_id
));

create policy public_product_attribute_value_translations_select
on public.product_attribute_value_translations
for select to anon, authenticated
using (exists (
  select 1 from public.product_attribute_values as value
  where value.id = value_id
));

create policy public_site_settings_select on public.site_settings
for select to anon, authenticated using (true);

create policy own_profile_select on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy own_role_select on public.user_roles
for select to authenticated
using (user_id = (select auth.uid()));

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
    'product_attribute_value_translations', 'site_settings'
  ] loop
    execute format(
      'create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      table_name
    );
  end loop;
end;
$$;

revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;

grant select on table
  public.categories, public.category_translations, public.products,
  public.product_translations, public.product_images,
  public.product_image_translations, public.attribute_groups,
  public.attribute_group_translations, public.attributes,
  public.attribute_translations, public.attribute_options,
  public.attribute_option_translations, public.category_attributes,
  public.product_attribute_values,
  public.product_attribute_value_translations, public.site_settings
to anon, authenticated;

grant select on table public.profiles, public.user_roles to authenticated;

grant insert, update, delete on table
  public.profiles, public.user_roles, public.categories,
  public.category_translations, public.products, public.product_translations,
  public.product_images, public.product_image_translations,
  public.attribute_groups, public.attribute_group_translations,
  public.attributes, public.attribute_translations, public.attribute_options,
  public.attribute_option_translations, public.category_attributes,
  public.product_attribute_values,
  public.product_attribute_value_translations, public.site_settings
to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres
  revoke all on functions from public, anon, authenticated, service_role;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));

create policy product_images_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$'
  and exists (
    select 1 from public.products as product
    where product.id::text = (storage.foldername(name))[1]
  )
);

create policy product_images_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and (select private.is_admin()));
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
-- Tehnosklad Stage 5: durable leads and a safe Telegram delivery outbox.

create type public.lead_status as enum (
  'new', 'in_progress', 'contacted', 'closed', 'spam'
);
create type public.lead_source as enum (
  'home_contact', 'contacts_page', 'home_product_card',
  'catalog_product_card', 'category_product_card', 'product_page',
  'similar_product_card'
);
create type public.lead_delivery_state as enum (
  'queued', 'processing', 'retry_wait', 'succeeded',
  'permanent_failure', 'manual_review'
);
create type public.lead_delivery_outcome as enum (
  'succeeded', 'retryable_failure', 'permanent_failure',
  'uncertain_failure'
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  client_fingerprint_hash text not null check (
    client_fingerprint_hash ~ '^[0-9a-f]{64}$'
  ),
  phone_hash text not null check (phone_hash ~ '^[0-9a-f]{64}$'),
  status public.lead_status not null default 'new',
  locale public.app_locale not null,
  source public.lead_source not null,
  source_path text not null check (
    char_length(source_path) between 3 and 500
    and left(source_path, 1) = '/'
    and source_path not like '//%'
    and source_path !~ '[[:cntrl:]]'
    and (
      source_path = '/' || locale::text
      or source_path like '/' || locale::text || '/%'
    )
  ),
  name text not null check (
    char_length(name) between 2 and 100 and name = btrim(name)
  ),
  phone text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  telegram_username text check (
    telegram_username is null
    or telegram_username ~ '^@[A-Za-z0-9_]{5,32}$'
  ),
  comment text check (
    comment is null
    or (char_length(comment) between 1 and 2000 and comment = btrim(comment))
  ),
  consent_at timestamptz not null default now(),
  consent_version text not null check (
    consent_version ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
  ),
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text check (
    product_name_snapshot is null
    or char_length(product_name_snapshot) between 1 and 240
  ),
  product_price_minor bigint check (
    product_price_minor is null or product_price_minor >= 0
  ),
  product_currency char(3) check (
    product_currency is null or product_currency = 'MDL'
  ),
  product_path_snapshot text check (
    product_path_snapshot is null
    or (
      char_length(product_path_snapshot) between 1 and 500
      and left(product_path_snapshot, 1) = '/'
      and product_path_snapshot not like '//%'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (product_name_snapshot is null)::integer
    + (product_price_minor is null)::integer
    + (product_currency is null)::integer
    + (product_path_snapshot is null)::integer in (0, 4)
  ),
  check (product_id is null or product_name_snapshot is not null)
);

create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  previous_status public.lead_status,
  status public.lead_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (previous_status is distinct from status)
);

create table public.lead_telegram_deliveries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads (id) on delete cascade,
  state public.lead_delivery_state not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_started_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 100
  ),
  last_error_code text check (
    last_error_code is null or last_error_code ~ '^[a-z0-9_]{1,80}$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (state = 'processing')
    = (lease_token is not null and lease_started_at is not null)
  ),
  check (state <> 'succeeded' or delivered_at is not null)
);

create table public.lead_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.lead_telegram_deliveries (id)
    on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 3),
  lease_token uuid not null unique,
  outcome public.lead_delivery_outcome,
  provider_http_status integer check (
    provider_http_status is null or provider_http_status between 100 and 599
  ),
  provider_error_code integer,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 100
  ),
  retry_after_seconds integer check (
    retry_after_seconds is null or retry_after_seconds between 1 and 3600
  ),
  error_code text check (
    error_code is null or error_code ~ '^[a-z0-9_]{1,80}$'
  ),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (delivery_id, attempt_number),
  check ((outcome is null) = (finished_at is null))
);

create table private.lead_rate_limits (
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  bucket text not null check (bucket in ('ip_15m', 'phone_1h')),
  window_start timestamptz not null,
  submission_count integer not null check (submission_count > 0),
  expires_at timestamptz not null,
  primary key (subject_hash, bucket, window_start)
);

create index leads_status_created_idx
  on public.leads (status, created_at desc);
create index leads_product_created_idx
  on public.leads (product_id, created_at desc) where product_id is not null;
create index leads_fingerprint_created_idx
  on public.leads (client_fingerprint_hash, created_at desc);
create index leads_phone_created_idx
  on public.leads (phone_hash, created_at desc);
create index lead_status_history_lead_created_idx
  on public.lead_status_history (lead_id, created_at desc);
create index lead_telegram_deliveries_due_idx
  on public.lead_telegram_deliveries (available_at, created_at)
  where state in ('queued', 'retry_wait');
create index lead_delivery_attempts_delivery_started_idx
  on public.lead_delivery_attempts (delivery_id, started_at desc);
create index lead_rate_limits_expiry_idx
  on private.lead_rate_limits (expires_at);

create function private.record_lead_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.lead_status_history (
      lead_id, previous_status, status, changed_by
    ) values (
      new.id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create function private.create_lead_telegram_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lead_telegram_deliveries (lead_id) values (new.id);
  return new;
end;
$$;

create function private.protect_lead_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

create trigger set_leads_updated_at
before update on public.leads
for each row execute function private.set_updated_at();
create trigger protect_lead_fields
before update on public.leads
for each row execute function private.protect_lead_fields();
create trigger record_lead_status
after insert or update of status on public.leads
for each row execute function private.record_lead_status();
create trigger create_lead_telegram_delivery
after insert on public.leads
for each row execute function private.create_lead_telegram_delivery();
create trigger set_lead_telegram_deliveries_updated_at
before update on public.lead_telegram_deliveries
for each row execute function private.set_updated_at();

create function public.submit_public_lead(
  p_client_request_id uuid,
  p_request_hash text,
  p_client_fingerprint_hash text,
  p_phone_hash text,
  p_locale public.app_locale,
  p_source public.lead_source,
  p_source_path text,
  p_name text,
  p_phone text,
  p_telegram_username text default null,
  p_comment text default null,
  p_product_id uuid default null,
  p_consent_version text default 'stage-5-v1'
)
returns table (lead_id uuid, was_created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_lead public.leads%rowtype;
  product_name text;
  product_price bigint;
  product_currency text;
  product_path text;
  inserted_count integer;
  submission_time timestamptz := statement_timestamp();
  ip_window timestamptz;
  phone_window timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_client_request_id::text, 0)
  );

  select * into existing_lead
  from public.leads as lead
  where lead.client_request_id = p_client_request_id;
  if found then
    if existing_lead.request_hash <> p_request_hash then
      raise exception 'lead_idempotency_conflict' using errcode = '22023';
    end if;
    return query select existing_lead.id, false;
    return;
  end if;

  if p_request_hash !~ '^[0-9a-f]{64}$'
    or p_client_fingerprint_hash !~ '^[0-9a-f]{64}$'
    or p_phone_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid lead hashes' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_client_fingerprint_hash, 1)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_phone_hash, 2)
  );

  delete from private.lead_rate_limits
  where expires_at < submission_time - interval '1 day';

  ip_window := pg_catalog.date_bin(
    interval '15 minutes', submission_time, timestamptz '2000-01-01 00:00:00+00'
  );
  inserted_count := null;
  insert into private.lead_rate_limits (
    subject_hash, bucket, window_start, submission_count, expires_at
  ) values (
    p_client_fingerprint_hash, 'ip_15m', ip_window, 1,
    ip_window + interval '15 minutes'
  )
  on conflict (subject_hash, bucket, window_start) do update
  set submission_count = private.lead_rate_limits.submission_count + 1
  where private.lead_rate_limits.submission_count < 5
  returning submission_count into inserted_count;
  if inserted_count is null then
    raise exception 'lead_rate_limited' using errcode = 'P0001';
  end if;

  phone_window := pg_catalog.date_bin(
    interval '1 hour', submission_time, timestamptz '2000-01-01 00:00:00+00'
  );
  inserted_count := null;
  insert into private.lead_rate_limits (
    subject_hash, bucket, window_start, submission_count, expires_at
  ) values (
    p_phone_hash, 'phone_1h', phone_window, 1,
    phone_window + interval '1 hour'
  )
  on conflict (subject_hash, bucket, window_start) do update
  set submission_count = private.lead_rate_limits.submission_count + 1
  where private.lead_rate_limits.submission_count < 3
  returning submission_count into inserted_count;
  if inserted_count is null then
    raise exception 'lead_rate_limited' using errcode = 'P0001';
  end if;

  if p_product_id is not null then
    select translation.name, product.price_minor, product.currency,
      format('/%s/product/%s', p_locale::text, translation.slug) as path
    into product_name, product_price, product_currency, product_path
    from public.products as product
    join public.categories as category on category.id = product.category_id
    join public.product_translations as translation
      on translation.product_id = product.id and translation.locale = p_locale
    where product.id = p_product_id
      and product.is_published and product.archived_at is null
      and category.is_published and category.archived_at is null;
    if not found then
      raise exception 'lead_product_unavailable' using errcode = '22023';
    end if;
  end if;

  insert into public.leads (
    client_request_id, request_hash, client_fingerprint_hash, phone_hash,
    locale, source, source_path, name, phone, telegram_username, comment,
    consent_version, product_id, product_name_snapshot,
    product_price_minor, product_currency, product_path_snapshot
  ) values (
    p_client_request_id, p_request_hash, p_client_fingerprint_hash,
    p_phone_hash, p_locale, p_source, p_source_path, p_name, p_phone,
    p_telegram_username, p_comment, p_consent_version, p_product_id,
    product_name, product_price, product_currency, product_path
  )
  returning id into lead_id;
  was_created := true;
  return next;
end;
$$;

create function public.claim_lead_telegram_delivery(p_lead_id uuid default null)
returns table (
  attempt_id uuid,
  delivery_id uuid,
  lead_id uuid,
  attempt_number integer,
  lease_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.lead_telegram_deliveries%rowtype;
begin
  update public.lead_delivery_attempts as attempt
  set outcome = 'uncertain_failure', finished_at = now(),
    error_code = 'stale_processing_lease'
  from public.lead_telegram_deliveries as delivery
  where delivery.id = attempt.delivery_id
    and delivery.state = 'processing'
    and delivery.lease_started_at < now() - interval '5 minutes'
    and attempt.lease_token = delivery.lease_token
    and attempt.outcome is null;
  update public.lead_telegram_deliveries
  set state = 'manual_review', lease_token = null, lease_started_at = null,
    last_error_code = 'stale_processing_lease'
  where state = 'processing'
    and lease_started_at < now() - interval '5 minutes';

  select delivery.* into claimed
  from public.lead_telegram_deliveries as delivery
  where (p_lead_id is null or delivery.lead_id = p_lead_id)
    and delivery.state in ('queued', 'retry_wait')
    and delivery.available_at <= now()
    and delivery.attempt_count < 3
  order by delivery.available_at, delivery.created_at
  for update skip locked
  limit 1;
  if not found then return; end if;

  attempt_id := extensions.gen_random_uuid();
  delivery_id := claimed.id;
  lead_id := claimed.lead_id;
  attempt_number := claimed.attempt_count + 1;
  lease_token := extensions.gen_random_uuid();

  update public.lead_telegram_deliveries
  set state = 'processing',
    attempt_count = claim_lead_telegram_delivery.attempt_number,
    lease_token = claim_lead_telegram_delivery.lease_token,
    lease_started_at = now(), last_error_code = null
  where id = claim_lead_telegram_delivery.delivery_id;
  insert into public.lead_delivery_attempts (
    id, delivery_id, attempt_number, lease_token
  ) values (
    claim_lead_telegram_delivery.attempt_id,
    claim_lead_telegram_delivery.delivery_id,
    claim_lead_telegram_delivery.attempt_number,
    claim_lead_telegram_delivery.lease_token
  );
  return next;
end;
$$;

create function public.complete_lead_telegram_delivery(
  p_attempt_id uuid,
  p_lease_token uuid,
  p_outcome public.lead_delivery_outcome,
  p_error_code text default null,
  p_provider_http_status integer default null,
  p_provider_error_code integer default null,
  p_provider_message_id text default null,
  p_retry_after_seconds integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempt public.lead_delivery_attempts%rowtype;
  current_delivery public.lead_telegram_deliveries%rowtype;
  retry_seconds integer;
begin
  select * into current_attempt
  from public.lead_delivery_attempts
  where id = p_attempt_id and lease_token = p_lease_token
  for update;
  if not found or current_attempt.outcome is not null then
    raise exception 'delivery attempt is not active' using errcode = '22023';
  end if;
  select * into current_delivery
  from public.lead_telegram_deliveries
  where id = current_attempt.delivery_id and lease_token = p_lease_token
    and state = 'processing'
  for update;
  if not found then
    raise exception 'delivery lease is not active' using errcode = '22023';
  end if;
  if p_error_code is not null and p_error_code !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid delivery error code' using errcode = '22023';
  end if;

  retry_seconds := least(greatest(coalesce(p_retry_after_seconds, 60), 1), 3600);
  update public.lead_delivery_attempts
  set outcome = p_outcome, provider_http_status = p_provider_http_status,
    provider_error_code = p_provider_error_code,
    provider_message_id = p_provider_message_id,
    retry_after_seconds = case
      when p_outcome = 'retryable_failure' then retry_seconds else null end,
    error_code = p_error_code, finished_at = now()
  where id = p_attempt_id;

  update public.lead_telegram_deliveries
  set state = case
      when p_outcome = 'succeeded' then 'succeeded'::public.lead_delivery_state
      when p_outcome = 'retryable_failure' and attempt_count < 3
        then 'retry_wait'::public.lead_delivery_state
      when p_outcome = 'uncertain_failure'
        then 'manual_review'::public.lead_delivery_state
      else 'permanent_failure'::public.lead_delivery_state
    end,
    available_at = case
      when p_outcome = 'retryable_failure' and attempt_count < 3
        then now() + pg_catalog.make_interval(secs => retry_seconds)
      else available_at
    end,
    lease_token = null, lease_started_at = null,
    delivered_at = case when p_outcome = 'succeeded' then now() else null end,
    provider_message_id = p_provider_message_id,
    last_error_code = p_error_code
  where id = current_delivery.id;
end;
$$;

alter table public.leads enable row level security;
alter table public.lead_status_history enable row level security;
alter table public.lead_telegram_deliveries enable row level security;
alter table public.lead_delivery_attempts enable row level security;

create policy admin_all on public.leads
for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy admin_all on public.lead_status_history
for select to authenticated using ((select private.is_admin()));
create policy admin_all on public.lead_telegram_deliveries
for select to authenticated using ((select private.is_admin()));
create policy admin_all on public.lead_delivery_attempts
for select to authenticated using ((select private.is_admin()));

revoke all on table public.leads, public.lead_status_history,
  public.lead_telegram_deliveries, public.lead_delivery_attempts
  from anon, authenticated, service_role;
grant select on table public.leads, public.lead_status_history,
  public.lead_telegram_deliveries, public.lead_delivery_attempts
  to authenticated;
grant update (status) on table public.leads to authenticated;
grant select, insert, update, delete on table public.leads,
  public.lead_status_history, public.lead_telegram_deliveries,
  public.lead_delivery_attempts to service_role;

revoke all on table private.lead_rate_limits
  from public, anon, authenticated, service_role;
revoke all on function private.record_lead_status()
  from public, anon, authenticated, service_role;
revoke all on function private.create_lead_telegram_delivery()
  from public, anon, authenticated, service_role;
revoke all on function private.protect_lead_fields()
  from public, anon, authenticated, service_role;
revoke all on function public.submit_public_lead(
  uuid, text, text, text, public.app_locale, public.lead_source,
  text, text, text, text, text, uuid, text
) from public, anon, authenticated, service_role;
revoke all on function public.claim_lead_telegram_delivery(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.complete_lead_telegram_delivery(
  uuid, uuid, public.lead_delivery_outcome, text, integer, integer,
  text, integer
) from public, anon, authenticated, service_role;
grant execute on function public.submit_public_lead(
  uuid, text, text, text, public.app_locale, public.lead_source,
  text, text, text, text, text, uuid, text
) to service_role;
grant execute on function public.claim_lead_telegram_delivery(uuid)
  to service_role;
grant execute on function public.complete_lead_telegram_delivery(
  uuid, uuid, public.lead_delivery_outcome, text, integer, integer,
  text, integer
) to service_role;
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
-- Tehnosklad Stage 7: privacy-preserving assistant rate limit.
-- No conversation, prompt or provider response is persisted.

create table private.assistant_rate_limits (
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (subject_hash, window_start)
);

create index assistant_rate_limits_expiry_idx
  on private.assistant_rate_limits (expires_at);

alter table private.assistant_rate_limits enable row level security;
revoke all on table private.assistant_rate_limits from public, anon, authenticated, service_role;

create function public.consume_assistant_rate_limit(subject_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := date_trunc('minute', now());
  next_count integer;
begin
  if subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid assistant rate-limit subject' using errcode = '22023';
  end if;
  delete from private.assistant_rate_limits where expires_at <= now();
  insert into private.assistant_rate_limits (subject_hash, window_start, request_count, expires_at)
  values (subject_hash, current_window, 1, current_window + interval '1 minute')
  on conflict (subject_hash, window_start) do update
    set request_count = private.assistant_rate_limits.request_count + 1
  returning request_count into next_count;
  return next_count <= 8;
end;
$$;

revoke all on function public.consume_assistant_rate_limit(text) from public, anon, authenticated, service_role;
grant execute on function public.consume_assistant_rate_limit(text) to anon, authenticated;
-- Stage 6/7 completion: category media, audited manual delivery retry and
-- privacy-preserving assistant telemetry. This migration is forward-only.

-- Category image is a single immutable public object. It is intentionally in
-- its own bucket so product-media paths and lifecycle policies stay unchanged.
alter table public.categories
  add column image_storage_path text unique check (
    image_storage_path is null or image_storage_path ~
      '^categories/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images', 'category-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy category_images_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'category-images' and (select private.is_admin()));

create policy category_images_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'category-images'
  and (select private.is_admin())
  and name ~ '^categories/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$'
);

create policy category_images_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'category-images' and (select private.is_admin()));

create function public.admin_set_category_image(p_category_id uuid, p_storage_path text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_storage_path is not null and p_storage_path !~
    '^categories/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpe?g|png|webp)$' then
    raise exception 'invalid_category_image_path' using errcode = '22023';
  end if;
  update public.categories set image_storage_path = p_storage_path
  where id = p_category_id;
  if not found then raise exception 'category_not_found' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.admin_set_category_image(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_set_category_image(uuid, text) to authenticated;

-- A manual retry preserves all completed attempts. The existing per-delivery
-- attempt number is reset only after moving historic rows to a new generation.
alter table public.lead_telegram_deliveries
  add column retry_generation integer not null default 0 check (retry_generation >= 0);
alter table public.lead_delivery_attempts
  add column retry_generation integer not null default 0 check (retry_generation >= 0);
alter table public.lead_delivery_attempts
  drop constraint lead_delivery_attempts_delivery_id_attempt_number_key;
alter table public.lead_delivery_attempts
  add constraint lead_delivery_attempts_delivery_generation_attempt_key
  unique (delivery_id, retry_generation, attempt_number);

create or replace function public.claim_lead_telegram_delivery(p_lead_id uuid default null)
returns table (attempt_id uuid, delivery_id uuid, lead_id uuid, attempt_number integer, lease_token uuid)
language plpgsql security definer set search_path = '' as $$
declare claimed public.lead_telegram_deliveries%rowtype;
begin
  update public.lead_delivery_attempts as attempt
  set outcome = 'uncertain_failure', finished_at = now(), error_code = 'stale_processing_lease'
  from public.lead_telegram_deliveries as delivery
  where delivery.id = attempt.delivery_id and delivery.state = 'processing'
    and delivery.lease_started_at < now() - interval '5 minutes'
    and attempt.lease_token = delivery.lease_token and attempt.outcome is null;
  update public.lead_telegram_deliveries
  set state = 'manual_review', lease_token = null, lease_started_at = null,
      last_error_code = 'stale_processing_lease'
  where state = 'processing' and lease_started_at < now() - interval '5 minutes';
  select delivery.* into claimed from public.lead_telegram_deliveries as delivery
  where (p_lead_id is null or delivery.lead_id = p_lead_id)
    and delivery.state in ('queued', 'retry_wait') and delivery.available_at <= now()
    and delivery.attempt_count < 3
  order by delivery.available_at, delivery.created_at for update skip locked limit 1;
  if not found then return; end if;
  attempt_id := extensions.gen_random_uuid(); delivery_id := claimed.id; lead_id := claimed.lead_id;
  attempt_number := claimed.attempt_count + 1; lease_token := extensions.gen_random_uuid();
  update public.lead_telegram_deliveries set state = 'processing', attempt_count = attempt_number,
    lease_token = claim_lead_telegram_delivery.lease_token, lease_started_at = now(), last_error_code = null
  where id = delivery_id;
  insert into public.lead_delivery_attempts (id, delivery_id, retry_generation, attempt_number, lease_token)
  values (attempt_id, delivery_id, claimed.retry_generation, attempt_number, lease_token);
  return next;
end;
$$;

create function public.admin_requeue_lead_telegram_delivery(p_lead_id uuid, p_confirm_uncertain boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  update public.lead_telegram_deliveries
  set state = 'queued', attempt_count = 0, retry_generation = retry_generation + 1,
      available_at = now(), lease_token = null, lease_started_at = null, last_error_code = null
  where lead_id = p_lead_id and state <> 'succeeded' and state <> 'processing'
    and (state <> 'manual_review' or p_confirm_uncertain);
  if not found then raise exception 'delivery_not_retryable' using errcode = '22023'; end if;
end;
$$;
revoke all on function public.admin_requeue_lead_telegram_delivery(uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_requeue_lead_telegram_delivery(uuid, boolean) to authenticated;

-- Service-only assistant rate limiting closes direct Data API abuse.
revoke all on function public.consume_assistant_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_assistant_rate_limit(text) to service_role;

create table public.assistant_knowledge (
  id uuid primary key default extensions.gen_random_uuid(),
  locale public.app_locale not null,
  title text not null check (char_length(title) between 1 and 160),
  content text not null check (char_length(content) between 1 and 5000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.assistant_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  request_id uuid not null unique,
  locale public.app_locale not null,
  outcome text not null check (outcome ~ '^[a-z0-9_]{1,80}$'),
  provider text not null check (provider ~ '^[a-z0-9_-]{1,80}$'),
  duration_bucket text not null check (duration_bucket in ('lt_250', 'lt_1000', 'gte_1000')),
  fallback_used boolean not null,
  reference_count integer not null check (reference_count between 0 and 5),
  created_at timestamptz not null default now()
);
create index assistant_logs_created_at_idx on public.assistant_logs (created_at desc);
alter table public.assistant_knowledge enable row level security;
alter table public.assistant_logs enable row level security;
create policy admin_all on public.assistant_knowledge for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_all on public.assistant_logs for select to authenticated
  using ((select private.is_admin()));
revoke all on table public.assistant_knowledge, public.assistant_logs
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.assistant_knowledge, public.assistant_logs to service_role;
grant select on table public.assistant_knowledge, public.assistant_logs to authenticated;

-- Repair public child reachability. Every public child now has a complete
-- path to a published category/product and active binding/attribute.
drop policy public_product_image_translations_select on public.product_image_translations;
create policy public_product_image_translations_select on public.product_image_translations
for select to anon, authenticated using (exists (
  select 1 from public.product_images image join public.products product on product.id = image.product_id
  join public.categories category on category.id = product.category_id
  where image.id = image_id and image.deletion_pending_at is null
    and product.is_published and product.archived_at is null
    and category.is_published and category.archived_at is null
));
drop policy public_attributes_select on public.attributes;
create policy public_attributes_select on public.attributes for select to anon, authenticated using (
  is_active and exists (select 1 from public.category_attributes binding join public.categories category on category.id = binding.category_id
    where binding.attribute_id = public.attributes.id and category.is_published and category.archived_at is null)
);
drop policy public_attribute_translations_select on public.attribute_translations;
create policy public_attribute_translations_select on public.attribute_translations for select to anon, authenticated using (exists (
  select 1 from public.attributes attribute where attribute.id = public.attribute_translations.attribute_id and attribute.is_active
    and exists (select 1 from public.category_attributes binding join public.categories category on category.id = binding.category_id
      where binding.attribute_id = attribute.id and category.is_published and category.archived_at is null)
));
drop policy public_attribute_groups_select on public.attribute_groups;
create policy public_attribute_groups_select on public.attribute_groups for select to anon, authenticated using (
  is_active and exists (select 1 from public.attributes attribute join public.category_attributes binding on binding.attribute_id = attribute.id
    join public.categories category on category.id = binding.category_id where attribute.group_id = public.attribute_groups.id and attribute.is_active
      and category.is_published and category.archived_at is null)
);
drop policy public_attribute_group_translations_select on public.attribute_group_translations;
create policy public_attribute_group_translations_select on public.attribute_group_translations for select to anon, authenticated using (exists (
  select 1 from public.attribute_groups group_row where group_row.id = public.attribute_group_translations.group_id and group_row.is_active
    and exists (select 1 from public.attributes attribute join public.category_attributes binding on binding.attribute_id = attribute.id
      join public.categories category on category.id = binding.category_id where attribute.group_id = group_row.id and attribute.is_active
        and category.is_published and category.archived_at is null)
));
drop policy public_attribute_options_select on public.attribute_options;
create policy public_attribute_options_select on public.attribute_options for select to anon, authenticated using (
  is_active and exists (select 1 from public.attributes attribute join public.category_attributes binding on binding.attribute_id = attribute.id
    join public.categories category on category.id = binding.category_id where attribute.id = public.attribute_options.attribute_id and attribute.is_active
      and category.is_published and category.archived_at is null)
);
drop policy public_attribute_option_translations_select on public.attribute_option_translations;
create policy public_attribute_option_translations_select on public.attribute_option_translations for select to anon, authenticated using (exists (
  select 1 from public.attribute_options option_row where option_row.id = public.attribute_option_translations.option_id and option_row.is_active
    and exists (select 1 from public.attributes attribute join public.category_attributes binding on binding.attribute_id = attribute.id
      join public.categories category on category.id = binding.category_id where attribute.id = option_row.attribute_id and attribute.is_active
        and category.is_published and category.archived_at is null)
));
drop policy public_product_attribute_values_select on public.product_attribute_values;
create policy public_product_attribute_values_select on public.product_attribute_values for select to anon, authenticated using (
  exists (select 1 from public.products product join public.categories category on category.id = product.category_id
    join public.attributes attribute on attribute.id = attribute_id join public.category_attributes binding
      on binding.category_id = product.category_id and binding.attribute_id = attribute.id
    where product.id = public.product_attribute_values.product_id and product.is_published and product.archived_at is null
      and category.is_published and category.archived_at is null and attribute.is_active)
);
drop policy public_product_attribute_value_translations_select on public.product_attribute_value_translations;
create policy public_product_attribute_value_translations_select on public.product_attribute_value_translations for select to anon, authenticated using (exists (
  select 1 from public.product_attribute_values value join public.products product on product.id = value.product_id
  join public.categories category on category.id = product.category_id join public.attributes attribute on attribute.id = value.attribute_id
  join public.category_attributes binding on binding.category_id = product.category_id and binding.attribute_id = attribute.id
  where value.id = public.product_attribute_value_translations.value_id and product.is_published and product.archived_at is null
    and category.is_published and category.archived_at is null and attribute.is_active
));
-- Required public contact settings for a first production deployment.
-- Existing owner-managed settings are deliberately preserved.
insert into public.site_settings (key, locale, value) values
  ('phone_display', 'ru', '+373 69 166 172'),
  ('phone_display', 'ro', '+373 69 166 172'),
  ('phone_href', 'ru', 'tel:+37369166172'),
  ('phone_href', 'ro', 'tel:+37369166172'),
  ('address', 'ru', 'ул. Победы, 97, Комрат'),
  ('address', 'ro', 'str. Victoriei, 97, Comrat'),
  ('open_days', 'ru', 'Вторник–воскресенье'),
  ('open_days', 'ro', 'Marți–duminică'),
  ('open_time', 'ru', '08:00–16:00'),
  ('open_time', 'ro', '08:00–16:00'),
  ('closed_day', 'ru', 'Понедельник — выходной'),
  ('closed_day', 'ro', 'Luni — zi liberă'),
  ('contact_text', 'ru', 'Позвоните нам в часы работы магазина.'),
  ('contact_text', 'ro', 'Sunați-ne în programul magazinului.')
on conflict (key, locale) do nothing;
-- Privacy retention enforcement for leads and privacy-preserving assistant logs.
-- Schedule `select * from private.enforce_privacy_retention();` at least
-- daily in Supabase Cron after reviewing the production backup policy.

create function private.enforce_privacy_retention()
returns table (
  deleted_leads bigint,
  deleted_assistant_logs bigint,
  deleted_lead_rate_limits bigint,
  deleted_assistant_rate_limits bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.leads
  where updated_at < now() - interval '24 months';
  get diagnostics deleted_leads = row_count;

  delete from public.assistant_logs
  where created_at < now() - interval '90 days';
  get diagnostics deleted_assistant_logs = row_count;

  delete from private.lead_rate_limits
  where expires_at < now();
  get diagnostics deleted_lead_rate_limits = row_count;

  delete from private.assistant_rate_limits
  where expires_at < now();
  get diagnostics deleted_assistant_rate_limits = row_count;

  return next;
end;
$$;

revoke all on function private.enforce_privacy_retention()
  from public, anon, authenticated, service_role;

-- Resolve the Stage 7 parameter/column ambiguity without changing the public
-- RPC signature. `$1` and the named constraint are unambiguous to PL/pgSQL.
create or replace function public.consume_assistant_rate_limit(subject_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := date_trunc('minute', now());
  next_count integer;
begin
  if $1 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid assistant rate-limit subject' using errcode = '22023';
  end if;

  delete from private.assistant_rate_limits where expires_at <= now();

  insert into private.assistant_rate_limits (
    subject_hash, window_start, request_count, expires_at
  )
  values ($1, current_window, 1, current_window + interval '1 minute')
  on conflict on constraint assistant_rate_limits_pkey do update
    set request_count = private.assistant_rate_limits.request_count + 1
  returning private.assistant_rate_limits.request_count into next_count;

  return next_count <= 8;
end;
$$;

revoke all on function public.consume_assistant_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_assistant_rate_limit(text) to service_role;
create or replace function public.consume_assistant_rate_limit(subject_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := date_trunc('minute', now());
  next_count integer;
begin
  if subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid assistant rate-limit subject' using errcode = '22023';
  end if;

  delete from private.assistant_rate_limits where expires_at <= now();
  insert into private.assistant_rate_limits (
    subject_hash, window_start, request_count, expires_at
  )
  values (subject_hash, current_window, 1, current_window + interval '1 minute')
  on conflict on constraint assistant_rate_limits_pkey do update
    set request_count = private.assistant_rate_limits.request_count + 1
  returning request_count into next_count;

  return next_count <= 8;
end;
$$;

revoke all on function public.consume_assistant_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_assistant_rate_limit(text) to service_role;
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
-- Admin workflow for the assistant knowledge base.
--
-- `public.assistant_knowledge` existed since stage 6/7 but had no write path,
-- so delivery, payment, warranty and return answers could never be published.
-- Writes go through atomic `admin_*` RPCs under RLS, like the rest of admin
-- CRUD: the admin client deliberately never uses the service-role key.

-- `updated_at` orders the articles the assistant loads; the table was created
-- after the initial trigger loop and never got one.
create trigger set_updated_at
  before update on public.assistant_knowledge
  for each row execute function private.set_updated_at();

-- RLS policy `admin_all` already restricts these rows to admins; without the
-- table grant an admin could only read the knowledge base.
grant insert, update, delete on table public.assistant_knowledge to authenticated;

create function public.admin_save_assistant_knowledge(
  p_id uuid,
  p_locale public.app_locale,
  p_title text,
  p_content text,
  p_is_active boolean
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
  if char_length(btrim(p_title)) = 0 or char_length(btrim(p_content)) = 0 then
    raise exception 'assistant_knowledge_incomplete' using errcode = '22023';
  end if;
  insert into public.assistant_knowledge (id, locale, title, content, is_active)
  values (target_id, p_locale, btrim(p_title), btrim(p_content), p_is_active)
  on conflict (id) do update set
    locale = excluded.locale,
    title = excluded.title,
    content = excluded.content,
    is_active = excluded.is_active;
  return target_id;
end;
$$;

create function public.admin_delete_assistant_knowledge(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  delete from public.assistant_knowledge where id = p_id;
  if not found then
    raise exception 'assistant_knowledge_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_save_assistant_knowledge(
  uuid, public.app_locale, text, text, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.admin_delete_assistant_knowledge(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.admin_save_assistant_knowledge(
  uuid, public.app_locale, text, text, boolean
) to authenticated;
grant execute on function public.admin_delete_assistant_knowledge(uuid)
  to authenticated;
-- Tehnosklad: leads submitted from the catalog assistant widget.
-- Postgres forbids using a new enum value in the transaction that adds it,
-- so this migration only extends public.lead_source.
alter type public.lead_source add value if not exists 'assistant';
-- Repair admin product saving.
--
-- `20260822000000_auto_popular_products.sql` dropped `products.is_popular` and
-- recreated `admin_save_product` without `p_is_popular`. Because `create or
-- replace function` cannot change a signature, that left two problems:
--
--   1. The old 15-argument overload survived. Its body still writes to the
--      removed `products.is_popular` column, so any call reaching it fails.
--   2. The new 14-argument overload never received a grant. The initial
--      schema revokes execute on new functions by default, so `authenticated`
--      cannot call it -- and that is the overload the admin form resolves to,
--      because `saveProductAction` sends no `p_is_popular`. Saving a product
--      from /admin therefore fails with permission denied on any database
--      built from these migrations.
--
-- `supabase/verification/integrity.sql` asserts both the overload inventory
-- and the grant, and fails on the current schema until this runs.

drop function if exists public.admin_save_product(
  uuid, uuid, text, text, text, bigint, bigint, public.availability_status,
  integer, boolean, boolean, boolean, integer, jsonb, jsonb
);

revoke all on function public.admin_save_product(
  uuid, uuid, text, text, text, bigint, bigint, public.availability_status,
  integer, boolean, boolean, integer, jsonb, jsonb
) from public, anon, authenticated, service_role;

grant execute on function public.admin_save_product(
  uuid, uuid, text, text, text, bigint, bigint, public.availability_status,
  integer, boolean, boolean, integer, jsonb, jsonb
) to authenticated;
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
