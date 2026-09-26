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
