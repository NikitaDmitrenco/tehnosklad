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
