-- =============================================================
-- Admin Pulse — Supabase schema (fresh install)
-- =============================================================
-- Run once in the Supabase SQL editor for a brand-new project.
-- For existing deployments, run the dated migrations under
-- ./migrations/ in chronological order instead.
-- Idempotent — safe to re-run.
-- =============================================================

-- ---------- Roles ----------

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

-- ---------- Offices (tenant boundary) ----------

create table if not exists public.offices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Profiles (extends auth.users) ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role_id     text not null default 'user' references public.roles(id),
  office_id   uuid references public.offices(id) on delete restrict,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Invariant: super_admin <-> office_id IS NULL
alter table public.profiles drop constraint if exists chk_role_office_consistency;
alter table public.profiles
  add constraint chk_role_office_consistency check (
    (role_id = 'super_admin' and office_id is null)
    or (role_id <> 'super_admin' and office_id is not null)
  );

-- ---------- AdminPulse API key (one per office) ----------

create table if not exists public.admin_pulse_keys (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null unique references public.offices(id) on delete cascade,
  encrypted_key   text not null,
  label           text,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- Triggers ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists offices_touch on public.offices;
create trigger offices_touch
  before update on public.offices
  for each row execute function public.set_updated_at();

drop trigger if exists admin_pulse_keys_touch on public.admin_pulse_keys;
create trigger admin_pulse_keys_touch
  before update on public.admin_pulse_keys
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.admin_pulse_keys enable row level security;
alter table public.offices enable row level security;
alter table public.roles enable row level security;

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

drop policy if exists offices_authenticated_read on public.offices;
create policy offices_authenticated_read on public.offices
  for select using (auth.uid() is not null);

drop policy if exists roles_authenticated_read on public.roles;
create policy roles_authenticated_read on public.roles
  for select using (auth.uid() is not null);

-- admin_pulse_keys: no policies on purpose. Only service_role touches it.
