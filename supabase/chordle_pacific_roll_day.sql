-- Enforce one global Chordle calendar day for every client.
-- Chordle's daily reset is midnight in America/Los_Angeles.
--
-- This is intentionally enforced in the database as well as the browser so
-- stale clients or users in other time zones cannot write a future local date.

begin;

create or replace function public.chordle_force_pacific_roll_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.roll_day := (clock_timestamp() at time zone 'America/Los_Angeles')::date;
  return new;
end;
$$;

drop trigger if exists chordle_force_pacific_roll_day_before_insert
on public.chordle_rolls;

create trigger chordle_force_pacific_roll_day_before_insert
before insert on public.chordle_rolls
for each row
execute function public.chordle_force_pacific_roll_day();

comment on function public.chordle_force_pacific_roll_day()
is 'Forces every Chordle roll to the current America/Los_Angeles calendar day, regardless of client timezone.';

commit;
