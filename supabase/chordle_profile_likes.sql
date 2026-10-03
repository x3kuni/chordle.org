-- Chordle profile social update
-- Adds profile likes and enforces the 16-character username cap used by the client.

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,16}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_username text;
begin
  requested_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));

  if requested_username !~ '^[A-Za-z0-9_]{3,16}$'
     or exists (
       select 1
       from public.profiles
       where lower(username)=lower(requested_username)
     )
  then
    requested_username := 'player_' || left(replace(new.id::text, '-', ''), 8);
  end if;

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
    requested_username,
    '#ffffff',
    0,
    coalesce(new.created_at, now())
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.handle_new_chordle_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_username text;
  fallback_username text;
begin
  requested_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  fallback_username := 'player_' || left(replace(new.id::text, '-', ''), 8);

  if requested_username !~ '^[A-Za-z0-9_]{3,16}$'
     or exists (
       select 1
       from public.profiles
       where lower(username)=lower(requested_username)
     )
  then
    requested_username := fallback_username;
  end if;

  insert into public.profiles (id, username)
  values (new.id, requested_username);

  return new;
end;
$function$;

revoke execute on function public.handle_new_chordle_user() from public, anon, authenticated;

create table if not exists public.chordle_profile_likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  liker_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, liker_id),
  constraint chordle_profile_likes_no_self check (profile_id <> liker_id)
);

alter table public.chordle_profile_likes enable row level security;

create index if not exists chordle_profile_likes_liker_id_idx
  on public.chordle_profile_likes (liker_id);

grant select on table public.chordle_profile_likes to anon, authenticated;
grant insert, delete on table public.chordle_profile_likes to authenticated;

drop policy if exists "Chordle profile likes are publicly readable" on public.chordle_profile_likes;
create policy "Chordle profile likes are publicly readable"
  on public.chordle_profile_likes
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can like other Chordle profiles" on public.chordle_profile_likes;
create policy "Users can like other Chordle profiles"
  on public.chordle_profile_likes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = liker_id
    and liker_id <> profile_id
    and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) is false
  );

drop policy if exists "Users can remove their own Chordle profile likes" on public.chordle_profile_likes;
create policy "Users can remove their own Chordle profile likes"
  on public.chordle_profile_likes
  for delete
  to authenticated
  using (
    (select auth.uid()) = liker_id
    and coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false) is false
  );
