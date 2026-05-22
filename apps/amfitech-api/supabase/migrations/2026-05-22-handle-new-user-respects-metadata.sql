-- =============================================================
-- 2026-05-22 — handle_new_user reads role_id + office_id from
--              raw_user_meta_data
-- =============================================================
-- Previously the trigger created a profile row with the column defaults
-- (role_id='user', office_id=null), which violates the chk_role_office
-- _consistency constraint for non-super_admin roles. As a result,
-- `supabase.auth.admin.createUser()` succeeded but the cascade trigger
-- failed and the whole INSERT was rolled back.
--
-- The new trigger reads:
--   * raw_user_meta_data->>'full_name'  — display name
--   * raw_user_meta_data->>'role_id'    — defaults to 'user' when absent
--   * raw_user_meta_data->>'office_id'  — must be present for non-
--                                          super_admin; forced null for
--                                          super_admin
--
-- The NestJS createUser flow passes these on auth.admin.createUser.
-- Idempotent — safe to re-run.
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id  text;
  v_office_id uuid;
begin
  v_role_id := coalesce(
    nullif(new.raw_user_meta_data->>'role_id', ''),
    'user'
  );
  v_office_id := case
    when v_role_id = 'super_admin' then null
    else nullif(new.raw_user_meta_data->>'office_id', '')::uuid
  end;

  insert into public.profiles (id, full_name, role_id, office_id)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    v_role_id,
    v_office_id
  );
  return new;
end;
$$;
