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
