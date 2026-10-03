-- Chordle daily rolls + badge ownership
-- Run once in Supabase -> SQL Editor after chordle_profiles_setup.sql.
--
-- This is the first shared multi-account persistence layer:
--   daily_rolls       one official roll per user per local calendar day
--   daily_roll_badges the badges produced by that roll
--   user_badges       one ownership row per user/badge
--
-- The browser may insert only rows for its authenticated UUID.
-- Profile lifetime_score is updated by a database trigger, not by browser UPDATEs.

begin;

create table if not exists public.daily_rolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roll_day date not null,
  notes smallint[] not null,
  score bigint not null check (score >= 0),
  chord_name text,
  chord_detail text,
  rarity text,
  created_at timestamptz not null default now(),
  unique (user_id, roll_day),
  check (cardinality(notes) = 6)
);

create table if not exists public.daily_roll_badges (
  roll_id bigint not null references public.daily_rolls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_description text,
  rarity text not null,
  points bigint not null check (points >= 0),
  special boolean not null default false,
  primary key (roll_id, badge_key)
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_description text,
  rarity text not null,
  points bigint not null check (points >= 0),
  first_roll_id bigint references public.daily_rolls(id) on delete set null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.daily_rolls enable row level security;
alter table public.daily_roll_badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Daily rolls are publicly readable" on public.daily_rolls;
create policy "Daily rolls are publicly readable"
on public.daily_rolls
for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert their own daily roll" on public.daily_rolls;
create policy "Users can insert their own daily roll"
on public.daily_rolls
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Roll badges are publicly readable" on public.daily_roll_badges;
create policy "Roll badges are publicly readable"
on public.daily_roll_badges
for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert badges for their own roll" on public.daily_roll_badges;
create policy "Users can insert badges for their own roll"
on public.daily_roll_badges
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.daily_rolls r
    where r.id = roll_id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists "Badge ownership is publicly readable" on public.user_badges;
create policy "Badge ownership is publicly readable"
on public.user_badges
for select
to anon, authenticated
using (true);

grant select on public.daily_rolls, public.daily_roll_badges, public.user_badges to anon, authenticated;
grant insert on public.daily_rolls, public.daily_roll_badges to authenticated;
revoke update, delete on public.daily_rolls, public.daily_roll_badges from anon, authenticated;
revoke insert, update, delete on public.user_badges from anon, authenticated;

create or replace function public.chordle_apply_daily_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set lifetime_score = coalesce(lifetime_score, 0) + new.score
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists chordle_daily_score_after_insert on public.daily_rolls;
create trigger chordle_daily_score_after_insert
after insert on public.daily_rolls
for each row
execute function public.chordle_apply_daily_score();

create or replace function public.chordle_collect_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.special then
    insert into public.user_badges (
      user_id, badge_key, badge_name, badge_description,
      rarity, points, first_roll_id, discovered_at
    )
    values (
      new.user_id, new.badge_key, new.badge_name, new.badge_description,
      new.rarity, new.points, new.roll_id, now()
    )
    on conflict (user_id, badge_key) do update
      set badge_name = excluded.badge_name,
          badge_description = excluded.badge_description,
          rarity = excluded.rarity,
          points = excluded.points;
  end if;
  return new;
end;
$$;

drop trigger if exists chordle_collect_badge_after_insert on public.daily_roll_badges;
create trigger chordle_collect_badge_after_insert
after insert on public.daily_roll_badges
for each row
execute function public.chordle_collect_badge();

commit;
