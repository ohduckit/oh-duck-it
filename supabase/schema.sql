-- Oh Duck It recruitment backend
-- Run this in the Supabase SQL Editor for the project used by the website.

create table if not exists public.officers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  character_name text not null check (char_length(trim(character_name)) between 2 and 50),
  realm text not null check (char_length(trim(realm)) between 2 and 60),
  region text not null default 'EU' check (region in ('EU','US','KR','TW')),
  class_name text not null check (char_length(trim(class_name)) between 3 and 30),
  main_spec text not null check (char_length(trim(main_spec)) between 2 and 40),
  role text not null check (role in ('Tank','Healer','Melee DPS','Ranged DPS','Flexible')),
  off_specs text,
  item_level integer check (item_level is null or item_level between 1 and 999),
  raiderio_url text,
  wcl_url text,
  armory_url text,
  current_progression text,
  raid_experience text,
  mplus_experience text,
  available_wed boolean not null default false,
  available_thu boolean not null default false,
  attendance_notes text,
  discord_contact text not null check (char_length(trim(discord_contact)) between 2 and 100),
  battle_tag text,
  why_odit text not null check (char_length(trim(why_odit)) between 5 and 2000),
  about_you text,
  privacy_consent boolean not null default false check (privacy_consent = true),
  status text not null default 'New' check (status in ('New','Reviewing','Interview','Trial','Accepted','Declined','Archived')),
  assigned_to uuid,
  assigned_name text
);

create table if not exists public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null,
  author_name text not null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Public guild-structure content. Everyone may read it; only authorised officers may update it.
create table if not exists public.guild_structure (
  id smallint primary key check (id = 1),
  assignments jsonb not null default '{}'::jsonb,
  mentors jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.guild_structure (id, assignments, mentors)
values (
  1,
  '{"raid-leader":"Duckie","tank-lead":"Duckie","healer-lead":"Phae","dps-lead":"To be appointed","mplus-lead":"To be appointed","recruit-lead":"Council interim","community-lead":"Council interim"}'::jsonb,
  '[{"spec":"Retribution Paladin","mentor":"Vacant"},{"spec":"Frost Death Knight","mentor":"Vacant"},{"spec":"Restoration Shaman","mentor":"Vacant"}]'::jsonb
) on conflict (id) do nothing;

create or replace function public.is_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.officers o
    where o.user_id = (select auth.uid())
      and o.active = true
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at
before update on public.applications
for each row execute function public.touch_updated_at();

drop trigger if exists guild_structure_touch_updated_at on public.guild_structure;
create trigger guild_structure_touch_updated_at
before update on public.guild_structure
for each row execute function public.touch_updated_at();

alter table public.officers enable row level security;
alter table public.applications enable row level security;
alter table public.application_notes enable row level security;
alter table public.guild_structure enable row level security;

-- Start from least privilege. The service_role remains administrative and bypasses RLS.
revoke all on table public.officers from anon, authenticated;
revoke all on table public.applications from anon, authenticated;
revoke all on table public.application_notes from anon, authenticated;
revoke all on table public.guild_structure from anon, authenticated;

-- Anyone may submit, including an officer who is already signed into the same site.
grant insert on table public.applications to anon, authenticated;
-- Only authenticated users can attempt to read/update; RLS limits this to active officers.
grant select, update on table public.applications to authenticated;
-- Officer notes are private and officer-only via RLS.
grant select, insert on table public.application_notes to authenticated;
-- Guild structure is public to read, but officer-only to modify.
grant select on table public.guild_structure to anon, authenticated;
grant update on table public.guild_structure to authenticated;
-- The browser uses this RPC to determine whether the signed-in user is an officer.
grant execute on function public.is_officer() to authenticated;

-- Public application submission: insert only. There is deliberately NO anon SELECT policy.
drop policy if exists "public may submit applications" on public.applications;
create policy "public may submit applications"
on public.applications for insert
to anon, authenticated
with check (
  privacy_consent = true
  and status = 'New'
  and assigned_to is null
  and assigned_name is null
);

-- Officers can read applications.
drop policy if exists "officers may read applications" on public.applications;
create policy "officers may read applications"
on public.applications for select
to authenticated
using ((select public.is_officer()));

-- Officers can update status/assignment. They cannot delete applications from the browser.
drop policy if exists "officers may update applications" on public.applications;
create policy "officers may update applications"
on public.applications for update
to authenticated
using ((select public.is_officer()))
with check ((select public.is_officer()));

-- Notes are visible only to officers.
drop policy if exists "officers may read notes" on public.application_notes;
create policy "officers may read notes"
on public.application_notes for select
to authenticated
using ((select public.is_officer()));

drop policy if exists "officers may add notes" on public.application_notes;
create policy "officers may add notes"
on public.application_notes for insert
to authenticated
with check (
  (select public.is_officer())
  and author_id = (select auth.uid())
);

-- Guild structure assignments are intentionally public information.
drop policy if exists "public may read guild structure" on public.guild_structure;
create policy "public may read guild structure"
on public.guild_structure for select
to anon, authenticated
using (true);

drop policy if exists "officers may update guild structure" on public.guild_structure;
create policy "officers may update guild structure"
on public.guild_structure for update
to authenticated
using ((select public.is_officer()))
with check ((select public.is_officer()));

-- No client grants or policies are provided for public.officers. It is maintained in
-- the Supabase SQL Editor / dashboard and read only inside the security-definer function.

-- BOOTSTRAP AN OFFICER
-- 1) Enable Discord Auth and sign into officers.html once.
-- 2) The page will show that user's UUID when they are not yet authorised.
-- 3) Add them using the SQL Editor, replacing the UUID/name below:
-- insert into public.officers (user_id, display_name)
-- values ('00000000-0000-0000-0000-000000000000', 'Duckie');
--
-- Repeat for each officer. To revoke access without deleting history:
-- update public.officers set active = false
-- where user_id = '00000000-0000-0000-0000-000000000000';
