-- Add sequential match_number column to matches (per-season)
alter table matches
  add column if not exists match_number integer;

-- Backfill match_number by season, ordered by creation date
with numbered as (
  select
    id,
    row_number() over (
      partition by season_id
      order by created_at asc, id asc
    ) as rn
  from matches
  where match_number is null
)
update matches m
   set match_number = numbered.rn
  from numbered
 where m.id = numbered.id
   and m.match_number is null;

-- Enforce uniqueness within a season (nulls remain allowed for future rows)
alter table matches
  drop constraint if exists matches_season_match_number_unique;

alter table matches
  add constraint matches_season_match_number_unique
  unique (season_id, match_number);
