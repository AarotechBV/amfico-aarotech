-- =============================================================
-- 2026-05-22 — Offices + Roles
-- =============================================================
-- Introduces:
--   * `roles`          — three seeded roles (user, admin, super_admin)
--   * `offices`        — the new tenant boundary
--   * profiles.role_id (FK to roles)        — replaces text `role` column
--   * profiles.office_id                    — null only for super_admin
--   * admin_pulse_keys.office_id            — replaces per-user key
--
-- Migration:
--   * Creates a single "Amfico" office and links every existing profile
--   * Promotes aaron@aarotech.be → super_admin and clears their office_id
--   * Moves every existing per-user API key to its user's office
--
-- Idempotent — safe to re-run.
-- =============================================================

-- ---------- 1. Roles ----------

create table if not exists public.roles (
  id            text primary key,
  label         text not null,
  level         int  not null,
  capabilities  jsonb not null default '{}'::jsonb
);

insert into public.roles (id, label, level) values
  ('user',        'Gebruiker',  10),
  ('admin',       'Admin',      20),
  ('super_admin', 'Super admin', 30)
on conflict (id) do update
  set label = excluded.label,
      level = excluded.level;

-- ---------- 2. Offices ----------

create table if not exists public.offices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists offices_touch on public.offices;
create trigger offices_touch
  before update on public.offices
  for each row execute function public.set_updated_at();

-- Bootstrap office (only if none exists yet)
do $$
begin
  if not exists (select 1 from public.offices) then
    insert into public.offices (name) values ('Amfico');
  end if;
end $$;

-- ---------- 3. Profiles: role_id ----------

alter table public.profiles
  add column if not exists role_id text references public.roles(id);

-- Backfill role_id from the old text `role` column (if it still exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    update public.profiles set role_id = role where role_id is null;
  end if;
end $$;

-- Anything still null gets the default
update public.profiles set role_id = 'user' where role_id is null;

alter table public.profiles
  alter column role_id set not null,
  alter column role_id set default 'user';

-- Drop policies that depend on the old `role` column before dropping it
-- (recreated in step 6 against role_id).
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;

-- Drop the old `role` text column + its check constraint (if any)
alter table public.profiles drop column if exists role;

-- ---------- 4. Profiles: office_id ----------

alter table public.profiles
  add column if not exists office_id uuid references public.offices(id) on delete restrict;

-- Backfill every profile to the default office (the one we created above,
-- which by definition is the oldest if there are others now).
-- NOTE: we do NOT promote super_admin here yet — it has to happen AFTER
-- the API-key migration below, otherwise the soon-to-be super_admin's
-- per-user key has no profile.office_id to map to and would be lost.
update public.profiles
set office_id = (select id from public.offices order by created_at limit 1)
where office_id is null;

-- ---------- 5. API keys: per office ----------

alter table public.admin_pulse_keys
  add column if not exists office_id uuid references public.offices(id) on delete cascade;

-- Move existing per-user keys to their user's office. At this point every
-- profile still has office_id set (super_admin promotion happens below),
-- so every existing key gets migrated cleanly.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_pulse_keys' and column_name = 'user_id'
  ) then
    update public.admin_pulse_keys k
    set office_id = p.office_id
    from public.profiles p
    where k.user_id = p.id
      and p.office_id is not null
      and k.office_id is null;

    delete from public.admin_pulse_keys where office_id is null;
  end if;
end $$;

-- ---------- 6. Promote aaron + add CHECK constraint ----------

-- Promote aaron@aarotech.be to super_admin AND clear his office_id
-- (super_admin's are tenant-less; they switch context via X-Active-Office)
update public.profiles
set role_id = 'super_admin', office_id = null
where id = (select id from auth.users where email = 'aaron@aarotech.be');

-- Invariant: super_admin ↔ office_id IS NULL; everyone else has an office
alter table public.profiles drop constraint if exists chk_role_office_consistency;
alter table public.profiles
  add constraint chk_role_office_consistency check (
    (role_id = 'super_admin' and office_id is null)
    or (role_id <> 'super_admin' and office_id is not null)
  );

alter table public.admin_pulse_keys
  alter column office_id set not null;

-- Replace UNIQUE(user_id) with UNIQUE(office_id)
alter table public.admin_pulse_keys
  drop constraint if exists admin_pulse_keys_user_id_key;
drop index if exists admin_pulse_keys_user_id_key;

create unique index if not exists admin_pulse_keys_office_id_key
  on public.admin_pulse_keys(office_id);

alter table public.admin_pulse_keys drop column if exists user_id;

-- ---------- 7. RLS policies (profiles) ----------

-- The role-check moves from `role` (text col) to `role_id` (FK).
-- NestJS still uses the service_role key and bypasses RLS; this is for
-- the anon client if anything ever queries via Supabase JS directly.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role_id = 'super_admin'
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

-- ---------- 8. RLS on offices + roles (read-only to authenticated) ----------

alter table public.offices enable row level security;
alter table public.roles enable row level security;

drop policy if exists offices_authenticated_read on public.offices;
create policy offices_authenticated_read on public.offices
  for select using (auth.uid() is not null);

drop policy if exists roles_authenticated_read on public.roles;
create policy roles_authenticated_read on public.roles
  for select using (auth.uid() is not null);
