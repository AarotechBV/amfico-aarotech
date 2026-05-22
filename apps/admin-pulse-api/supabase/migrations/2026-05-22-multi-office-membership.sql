-- =============================================================
-- 2026-05-22 — Multi-office membership
-- =============================================================
-- A user can belong to multiple offices. Replaces the single
-- profiles.office_id column with a join table profile_offices.
--
-- Changes:
--   * Creates `profile_offices(user_id, office_id)` (PK both columns)
--   * Backfills from the existing profiles.office_id (one row per user)
--   * Drops chk_role_office_consistency (replaced with service-level
--     enforcement; super_admin has zero memberships, others ≥ 1)
--   * Drops profiles.office_id
--   * Simplifies handle_new_user: it only creates the profile row
--     (id + full_name + role_id from raw_user_meta_data). The
--     NestJS UsersService inserts profile_offices rows after
--     auth.admin.createUser returns.
--
-- Supersedes 2026-05-22-handle-new-user-respects-metadata.sql.
-- Idempotent — safe to re-run.
-- =============================================================

-- ---------- 1. profile_offices join table ----------

create table if not exists public.profile_offices (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  office_id  uuid not null references public.offices(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, office_id)
);

create index if not exists profile_offices_office_id_idx
  on public.profile_offices(office_id);

-- ---------- 2. Backfill from profiles.office_id ----------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'office_id'
  ) then
    insert into public.profile_offices (user_id, office_id)
    select id, office_id
    from public.profiles
    where office_id is not null
    on conflict do nothing;
  end if;
end $$;

-- ---------- 3. Drop CHECK + office_id from profiles ----------

alter table public.profiles drop constraint if exists chk_role_office_consistency;
alter table public.profiles drop column if exists office_id;

-- ---------- 4. Simplified handle_new_user trigger ----------

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

  insert into public.profiles (id, full_name, role_id)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    v_role_id
  );
  return new;
end;
$$;

-- ---------- 5. RLS on profile_offices ----------

alter table public.profile_offices enable row level security;

drop policy if exists profile_offices_self_read on public.profile_offices;
create policy profile_offices_self_read on public.profile_offices
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_id = 'super_admin'
    )
  );
