-- ============================================================================
-- Re-curate the starter pack: familiar cuisines only, no desserts / sides /
-- breakfast / sweets, up to 2 per cuisine (~36 meals). Replaces the broad
-- "3 per category" set from 0002.
-- ============================================================================

update public.meals set is_starter = false;

with familiar as (
  select id,
         row_number() over (
           partition by area
           order by (youtube_url is not null) desc, md5('v3' || id::text)
         ) as rn
  from public.meals
  where image_url is not null
    -- coalesce so meals with no category still pass the "not a dessert/side" test
    and coalesce(category, '') not in ('Dessert', 'Side', 'Breakfast')
    and area in (
      'Italian', 'Thai', 'Vietnamese', 'Chinese', 'Japanese', 'India',
      'Mexican', 'United States', 'British', 'France', 'Greek', 'Spanish',
      'Turkish', 'Polish', 'Croatian', 'Ukrainian', 'Russian', 'Slovakia'
    )
    -- drop sweets that are mis-categorized as Vegan/Vegetarian/Misc
    and not (name ilike any (array[
      '%cake%', '%cookie%', '%brownie%', '%cheesecake%', '%pudding%',
      '%pancake%', '%muffin%', '%tart%', '%ice cream%', '%donut%',
      '%doughnut%', '%custard%', '%mousse%', '%trifle%', '%waffle%',
      '%scone%', '%sticky toffee%'
    ]))
)
update public.meals m
set is_starter = true
from familiar
where m.id = familiar.id and familiar.rn <= 2;
