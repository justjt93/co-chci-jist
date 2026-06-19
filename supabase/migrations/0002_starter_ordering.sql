-- ============================================================================
-- Starter ordering: serve meals in a shared, deterministic order so both
-- partners cover the same meals (fast common pool), with a curated "starter
-- pack" surfaced first.
-- ============================================================================

alter table public.meals add column if not exists sort_rank integer;
alter table public.meals add column if not exists is_starter boolean not null default false;

-- Stable, deterministic shuffle shared by every user (md5(id) → signed int).
update public.meals
set sort_rank = ('x' || substr(md5(id::text), 1, 8))::bit(32)::int
where sort_rank is null;

-- Curated starter pack: popular meals (have a video + image), up to 3 per
-- category, so the first round is shared, varied and appealing.
with picks as (
  select id,
         row_number() over (
           partition by category order by md5('s' || id::text)
         ) as rn
  from public.meals
  where youtube_url is not null
    and image_url is not null
    and category is not null
)
update public.meals m
set is_starter = true
from picks
where m.id = picks.id and picks.rn <= 3;

-- Unrated meals: starter pack first, then the rest — both in the shared shuffle.
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
  order by m.is_starter desc, m.sort_rank, m.id
  limit greatest(1, least(p_limit, 50));
$$;

-- How many starter-pack meals the caller still hasn't rated (for the UI).
create or replace function public.count_unrated_starters()
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from public.meals m
  where m.is_starter
    and not exists (
      select 1 from public.preferences p
      where p.meal_id = m.id and p.user_id = auth.uid()
    );
$$;

grant execute on function public.count_unrated_starters() to authenticated;
