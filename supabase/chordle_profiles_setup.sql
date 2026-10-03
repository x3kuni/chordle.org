-- Chordle Supabase profile setup
-- Run this once in Supabase -> SQL Editor.
--
-- This script:
-- 1) standardizes defaults on public.profiles
-- 2) makes profile rows publicly readable for Profile/Leaderboard
-- 3) lets authenticated users edit only their own username/name_color
-- 4) prevents browser clients from editing lifetime_score or joined_at
-- 5) standardizes the auth.users -> public.profiles signup trigger
-- 6) backfills profiles for any Auth users created before the trigger

begin;

alter table public.profiles enable row level security;

alter table public.profiles
  alter column lifetime_score set default 0,
  alter column joined_at set default now(),
  alter column name_color set default '#ffffff';

-- Public leaderboard/profile reads.
drop policy if exists "Public Profiles are readable" on public.profiles;
create policy "Public Profiles are readable"
on public.profiles
for select
to anon, authenticated
using (true);

-- A signed-in user may update only their own row.
drop policy if exists "Users can update their own profiles" on public.profiles;
create policy "Users can update their own profiles"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Table privileges are separate from RLS.
-- Everyone may read public profiles.
grant select on table public.profiles to anon, authenticated;

-- Browser clients should not create/delete profile rows.
revoke insert, delete on table public.profiles from anon, authenticated;

-- Prevent clients from changing authoritative score/joined time.
revoke update on table public.profiles from anon, authenticated;
grant update (username, name_color) on table public.profiles to authenticated;

-- Create one profile automatically for every new Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, name_color, lifetime_score, joined_at)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      'Player-' || left(new.id::text, 8)
    ),
    '#ffffff',
    0,
    coalesce(new.created_at, now())
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Standardize the trigger even if an older trigger with this name already exists.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Backfill profile rows for Auth users that existed before this trigger.
insert into public.profiles (id, username, name_color, lifetime_score, joined_at)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
    'Player-' || left(u.id::text, 8)
  ),
  '#ffffff',
  0,
  coalesce(u.created_at, now())
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

commit;
