-- ============================================================================
-- co chci jíst — initial schema
-- Tables: meals, rooms, room_members, preferences
-- Security: RLS so each user only touches their own data; matching happens
-- through SECURITY DEFINER RPCs that never expose a partner's raw choices.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.meals (
  id           integer primary key,            -- = TheMealDB idMeal
  name         text    not null,
  category     text,
  area         text,
  instructions text,
  image_url    text,
  youtube_url  text,
  tags         text[],
  ingredients  jsonb   not null default '[]'::jsonb,  -- [{name, measure}, ...]
  source       text    not null default 'themealdb'
);

create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id      uuid not null references public.rooms (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null default 'Guest',
  joined_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.preferences (
  user_id    uuid    not null references auth.users (id) on delete cascade,
  meal_id    integer not null references public.meals (id) on delete cascade,
  choice     text    not null check (choice in ('eat', 'pass')),
  updated_at timestamptz not null default now(),
  primary key (user_id, meal_id)
);

create index if not exists preferences_meal_idx on public.preferences (meal_id);
create index if not exists room_members_user_idx on public.room_members (user_id);

-- ----------------------------------------------------------------------------
-- Helper: is the current user a member of this room?
-- SECURITY DEFINER so it can read room_members without tripping RLS recursion.
-- ----------------------------------------------------------------------------
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.meals         enable row level security;
alter table public.rooms         enable row level security;
alter table public.room_members  enable row level security;
alter table public.preferences   enable row level security;

-- meals: world-readable catalog (writes happen only via the service role seed).
drop policy if exists "meals readable by all" on public.meals;
create policy "meals readable by all"
  on public.meals for select
  to anon, authenticated
  using (true);

-- preferences: a user fully owns their own rows.
drop policy if exists "own preferences" on public.preferences;
create policy "own preferences"
  on public.preferences for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rooms: readable only by their members (lookup-by-code happens in join_room).
drop policy if exists "members read their room" on public.rooms;
create policy "members read their room"
  on public.rooms for select
  to authenticated
  using (public.is_room_member(id));

-- room_members: a member can see every member of rooms they belong to,
-- and can add / update / remove their own membership row.
drop policy if exists "members read their rooms" on public.room_members;
create policy "members read their rooms"
  on public.room_members for select
  to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "add self to room" on public.room_members;
create policy "add self to room"
  on public.room_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own membership" on public.room_members;
create policy "update own membership"
  on public.room_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "leave room" on public.room_members;
create policy "leave room"
  on public.room_members for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Short, human-friendly room code (no ambiguous chars like O/0, I/1).
-- ----------------------------------------------------------------------------
create or replace function public.gen_room_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i      int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- create_room: make a new room with a unique code and add the caller to it.
-- ----------------------------------------------------------------------------
create or replace function public.create_room(p_display_name text default 'Guest')
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id   uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  loop
    v_code := public.gen_room_code();
    exit when not exists (select 1 from public.rooms r where r.code = v_code);
  end loop;

  insert into public.rooms (code, created_by)
  values (v_code, auth.uid())
  returning rooms.id into v_id;

  insert into public.room_members (room_id, user_id, display_name)
  values (v_id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Guest'));

  return query select v_id, v_code;
end;
$$;

-- ----------------------------------------------------------------------------
-- join_room: join an existing room by code (idempotent on display name).
-- ----------------------------------------------------------------------------
create or replace function public.join_room(p_code text, p_display_name text default 'Guest')
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select r.id into v_id from public.rooms r where r.code = upper(trim(p_code));
  if v_id is null then
    raise exception 'room not found';
  end if;

  insert into public.room_members (room_id, user_id, display_name)
  values (v_id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Guest'))
  on conflict (room_id, user_id)
  do update set display_name = excluded.display_name;

  return query select v_id, upper(trim(p_code));
end;
$$;

-- ----------------------------------------------------------------------------
-- get_room_matches: meals that EVERY member of the room marked as 'eat'.
-- SECURITY DEFINER (reads all members' choices) but gated on membership.
-- ----------------------------------------------------------------------------
create or replace function public.get_room_matches(p_room_id uuid)
returns setof public.meals
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_room_member(p_room_id) then
    raise exception 'not a member of this room';
  end if;

  return query
    select m.*
    from public.meals m
    join public.preferences p on p.meal_id = m.id
    join public.room_members rm
      on rm.user_id = p.user_id and rm.room_id = p_room_id
    where p.choice = 'eat'
    group by m.id
    having count(distinct p.user_id) =
           (select count(*) from public.room_members where room_id = p_room_id)
    order by m.name;
end;
$$;

-- ----------------------------------------------------------------------------
-- get_unrated_meals: a randomized batch of meals the caller hasn't rated yet.
-- SECURITY INVOKER: meals are public, own preferences are visible via RLS.
-- ----------------------------------------------------------------------------
create or replace function public.get_unrated_meals(p_limit int default 20)
returns setof public.meals
language sql
stable
set search_path = public
as $$
  select m.*
  from public.meals m
  where not exists (
    select 1 from public.preferences p
    where p.meal_id = m.id and p.user_id = auth.uid()
  )
  order by random()
  limit greatest(1, least(p_limit, 50));
$$;

-- ----------------------------------------------------------------------------
-- Grants (RLS still enforces row-level access; these are table-level privileges)
-- ----------------------------------------------------------------------------
grant select on public.meals to anon, authenticated;
grant select, insert, update, delete on public.preferences  to authenticated;
grant select, insert, update, delete on public.room_members to authenticated;
grant select on public.rooms to authenticated;

grant execute on function public.create_room(text)            to authenticated;
grant execute on function public.join_room(text, text)        to authenticated;
grant execute on function public.get_room_matches(uuid)       to authenticated;
grant execute on function public.get_unrated_meals(int)       to authenticated;
grant execute on function public.is_room_member(uuid)         to authenticated;
