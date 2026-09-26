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
