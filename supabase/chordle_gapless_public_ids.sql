-- Chordle gapless public profile IDs
-- Safe to run after chordle_public_ids.sql.
--
-- Why this exists:
-- PostgreSQL sequences are not transactional. A failed Supabase Auth signup can
-- consume a sequence value even when the auth/profile rows are rolled back.
-- That is why repeated failed signups can make visible IDs jump (for example
-- from #5 to #13) even though those missing accounts do not exist.
--
-- This migration:
-- 1) compacts CURRENT profile IDs in joined_at order (preserving account order)
-- 2) replaces the sequence-backed default with a transaction-safe allocator
-- 3) makes failed signup transactions stop consuming visible user IDs
--
-- Example: if the only surviving IDs are 1,2,3,4,5,13, they become
-- 1,2,3,4,5,6. Existing 1-5 remain unchanged.

begin;

lock table public.profiles in share row exclusive mode;

create temporary table chordle_public_id_repair
on commit drop
as
select
  id,
  row_number() over (
    order by joined_at asc nulls last, id asc
  )::bigint as new_public_id
from public.profiles;

-- Stage through negative values so the existing unique index cannot conflict
-- while rows swap/compact their positive IDs.
update public.profiles p
set public_id = -m.new_public_id
from chordle_public_id_repair m
where p.id = m.id;

update public.profiles p
set public_id = m.new_public_id
from chordle_public_id_repair m
where p.id = m.id;

create or replace function public.allocate_profile_public_id()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_id bigint;
begin
  -- Transaction-scoped lock serializes account-number allocation. Unlike a
  -- sequence, this value is not permanently consumed if the signup rolls back.
  perform pg_advisory_xact_lock(2047060311);

  select coalesce(max(p.public_id),0) + 1
  into next_id
  from public.profiles p;

  return next_id;
end;
$$;

alter table public.profiles
  alter column public_id
  set default public.allocate_profile_public_id();

-- Keep the auth trigger explicit and deterministic.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    public_id,
    username,
    name_color,
    lifetime_score,
    joined_at
  )
  values (
    new.id,
    public.allocate_profile_public_id(),
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- The old sequence can remain for compatibility, but make it match the compacted
-- data in case an older migration/tool still references it.
do $$
begin
  if to_regclass('public.profiles_public_id_seq') is not null then
    perform setval(
      'public.profiles_public_id_seq'::regclass,
      coalesce((select max(public_id) from public.profiles),0) + 1,
      false
    );
  end if;
end
$$;

commit;

-- Verification:
-- select public_id, username, joined_at
-- from public.profiles
-- order by public_id;
