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
