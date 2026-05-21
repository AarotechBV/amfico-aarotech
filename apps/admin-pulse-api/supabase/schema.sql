-- =============================================================
-- Admin Pulse — Supabase schema
-- Run once in the Supabase SQL editor for a fresh project.
-- Idempotent: safe to re-run; uses `create ... if not exists`
-- and `drop trigger if exists` where helpful.
-- =============================================================

-- 1. Profiles: extends auth.users with role + activation flag
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. AdminPulse API key per user (encrypted at rest by NestJS)
create table if not exists public.admin_pulse_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  encrypted_key   text not null,
  label           text,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3. Auto-create a profile row whenever a new auth user is created
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

-- 4. updated_at touchers
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

drop trigger if exists admin_pulse_keys_touch on public.admin_pulse_keys;
create trigger admin_pulse_keys_touch
  before update on public.admin_pulse_keys
  for each row execute function public.set_updated_at();

-- 5. Row-Level Security
-- NestJS uses the service_role key and bypasses RLS for admin operations,
-- but we still set sane defaults so any future surface using the anon
-- client is locked down by default.
alter table public.profiles enable row level security;
alter table public.admin_pulse_keys enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

-- admin_pulse_keys has no policies on purpose — anon/authenticated clients
-- cannot touch it. Only the service_role (NestJS) can read/write.
