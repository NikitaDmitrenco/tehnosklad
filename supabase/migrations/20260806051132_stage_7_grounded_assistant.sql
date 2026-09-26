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
