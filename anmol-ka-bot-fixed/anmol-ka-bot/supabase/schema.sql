-- =====================================================================
-- Anmol-Ka-Bot — Supabase schema, RLS policies and storage bucket
-- Run this once in Supabase Studio → SQL Editor → New query → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  job_roles text[] not null default '{}',
  preferred_platforms text[] not null default '{}',
  experience_years numeric,
  experience_summary text,
  resume_text text,
  resume_file_path text,
  location_preference text,
  is_active boolean not null default true,
  onboarded boolean not null default false,
  last_manual_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_date date not null default (now() at time zone 'utc')::date,
  status text not null default 'pending',        -- pending | success | failed
  trigger text not null default 'cron',          -- cron | manual
  jobs_found int not null default 0,
  jobs_sent int not null default 0,
  emails_sent int not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.sent_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.job_runs(id) on delete set null,
  job_url text not null,
  job_hash text not null,
  job_title text,
  company text,
  platform text,
  location text,
  posted_date text,
  relevance_score int,
  why_relevant text,
  tailored_resume_path text,
  sent_at timestamptz not null default now(),
  unique (user_id, job_hash)
);

create index if not exists idx_job_runs_user_date on public.job_runs (user_id, run_date desc);
create index if not exists idx_sent_jobs_user_sent on public.sent_jobs (user_id, sent_at desc);
create index if not exists idx_profiles_active on public.profiles (is_active) where is_active = true;

-- ---------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Auto-create a profile row on signup
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles  enable row level security;
alter table public.job_runs  enable row level security;
alter table public.sent_jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

drop policy if exists "job_runs_select_own" on public.job_runs;
create policy "job_runs_select_own" on public.job_runs
  for select using (auth.uid() = user_id);

drop policy if exists "sent_jobs_select_own" on public.sent_jobs;
create policy "sent_jobs_select_own" on public.sent_jobs
  for select using (auth.uid() = user_id);

-- NOTE: the cron worker uses the service-role key, which bypasses RLS,
-- so no write policies are needed for job_runs / sent_jobs.

-- ---------------------------------------------------------------------
-- 5. Storage bucket for resumes (private)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

drop policy if exists "resumes_read_own" on storage.objects;
create policy "resumes_read_own" on storage.objects
  for select using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_write_own" on storage.objects;
create policy "resumes_write_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_update_own" on storage.objects;
create policy "resumes_update_own" on storage.objects
  for update using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "resumes_delete_own" on storage.objects;
create policy "resumes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
