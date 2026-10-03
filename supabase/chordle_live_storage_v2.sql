-- Chordle dedicated live persistence tables
-- Run once in Supabase -> SQL Editor.
-- Uses Chordle-specific names so it does not depend on any older prototype tables.

begin;

create table if not exists public.chordle_rolls (
  id bigint generated always as identity primary key,
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

create table if not exists public.chordle_roll_badges (
  roll_id bigint not null references public.chordle_rolls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_description text,
  rarity text not null,
  points bigint not null check (points >= 0),
  special boolean not null default false,
  primary key (roll_id, badge_key)
);

create table if not exists public.chordle_user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_description text,
  rarity text not null,
  points bigint not null check (points >= 0),
  first_roll_id bigint references public.chordle_rolls(id) on delete set null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.chordle_rolls enable row level security;
alter table public.chordle_roll_badges enable row level security;
alter table public.chordle_user_badges enable row level security;

drop policy if exists "Chordle rolls are publicly readable" on public.chordle_rolls;
create policy "Chordle rolls are publicly readable"
on public.chordle_rolls for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert their own Chordle roll" on public.chordle_rolls;
create policy "Users can insert their own Chordle roll"
on public.chordle_rolls for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Chordle roll badges are publicly readable" on public.chordle_roll_badges;
create policy "Chordle roll badges are publicly readable"
on public.chordle_roll_badges for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert their own Chordle roll badges" on public.chordle_roll_badges;
create policy "Users can insert their own Chordle roll badges"
on public.chordle_roll_badges for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.chordle_rolls r
    where r.id = roll_id and r.user_id = (select auth.uid())
  )
);

drop policy if exists "Chordle badge ownership is publicly readable" on public.chordle_user_badges;
create policy "Chordle badge ownership is publicly readable"
on public.chordle_user_badges for select
to anon, authenticated
using (true);

grant select on public.chordle_rolls, public.chordle_roll_badges, public.chordle_user_badges to anon, authenticated;
grant insert on public.chordle_rolls, public.chordle_roll_badges to authenticated;
revoke update, delete on public.chordle_rolls, public.chordle_roll_badges from anon, authenticated;
revoke insert, update, delete on public.chordle_user_badges from anon, authenticated;

create or replace function public.chordle_apply_live_score()
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

drop trigger if exists chordle_live_score_after_insert on public.chordle_rolls;
create trigger chordle_live_score_after_insert
after insert on public.chordle_rolls
for each row
execute function public.chordle_apply_live_score();

create or replace function public.chordle_collect_live_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.special then
    insert into public.chordle_user_badges (
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

drop trigger if exists chordle_collect_live_badge_after_insert on public.chordle_roll_badges;
create trigger chordle_collect_live_badge_after_insert
after insert on public.chordle_roll_badges
for each row
execute function public.chordle_collect_live_badge();

commit;
