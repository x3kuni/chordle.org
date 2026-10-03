-- Chordle public sequential user IDs
-- Run once in Supabase -> SQL Editor before deploying the matching frontend.
--
-- IMPORTANT:
-- public.profiles.id stays UUID because Supabase Auth and existing foreign keys
-- depend on it. public_id is the short, visible account number shown to players.
--
-- Existing accounts are numbered in joined_at creation order.
-- If Kii, gyban, and LeDrivel are the first three profiles by joined_at,
-- they become User ID #1, #2, and #3 respectively.

begin;

create sequence if not exists public.profiles_public_id_seq;

alter table public.profiles
  add column if not exists public_id bigint;

lock table public.profiles in share row exclusive mode;

alter sequence public.profiles_public_id_seq
  owned by public.profiles.public_id;

alter table public.profiles
  alter column public_id set default nextval('public.profiles_public_id_seq'::regclass);

with base as (
  select coalesce(max(public_id),0)::bigint as n
  from public.profiles
),
missing as (
  select
    p.id,
    row_number() over (
      order by p.joined_at asc nulls last, p.id asc
    )::bigint as rn
  from public.profiles p
  where p.public_id is null
)
update public.profiles p
set public_id = base.n + missing.rn
from missing, base
where p.id = missing.id;

select setval(
  'public.profiles_public_id_seq'::regclass,
  coalesce((select max(public_id) from public.profiles),0) + 1,
  false
);

alter table public.profiles
  alter column public_id set not null;

create unique index if not exists profiles_public_id_key
  on public.profiles(public_id);

-- Public profiles are already readable. Keep public_id server-assigned:
-- authenticated browser clients may still update username/name_color only.
revoke update (public_id) on table public.profiles from anon, authenticated;

commit;

-- Optional verification:
-- select public_id, username, joined_at
-- from public.profiles
-- order by public_id;
