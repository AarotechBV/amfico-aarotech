-- =============================================================
-- 2026-05-22 — first_name + last_name on profiles
-- =============================================================
-- Replaces the free-form full_name with first_name + last_name. The
-- API computes the display fullName on the fly from these two.
--
-- Backfill: splits the existing full_name on the first space. Names
-- without a space go entirely into first_name (last_name = null).
--
-- The handle_new_user trigger is updated to read first_name +
-- last_name from raw_user_meta_data.
--
-- Idempotent — safe to re-run.
-- =============================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- Backfill from the legacy full_name column (if still present)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    update public.profiles
    set
      first_name = case
        when full_name is null or btrim(full_name) = '' then null
        when position(' ' in btrim(full_name)) = 0 then btrim(full_name)
        else split_part(btrim(full_name), ' ', 1)
      end,
      last_name = case
        when full_name is null or btrim(full_name) = '' then null
        when position(' ' in btrim(full_name)) = 0 then null
        else nullif(
          btrim(substr(btrim(full_name), position(' ' in btrim(full_name)) + 1)),
          ''
        )
      end
    where first_name is null and last_name is null;
  end if;
end $$;

alter table public.profiles drop column if exists full_name;

-- Replace the trigger to read first_name + last_name from metadata.
-- (Office membership is still inserted by the service after createUser.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id text;
begin
  v_role_id := coalesce(
    nullif(new.raw_user_meta_data->>'role_id', ''),
    'user'
  );

  insert into public.profiles (id, first_name, last_name, role_id)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    v_role_id
  );
  return new;
end;
$$;
