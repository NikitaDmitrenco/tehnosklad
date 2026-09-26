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
