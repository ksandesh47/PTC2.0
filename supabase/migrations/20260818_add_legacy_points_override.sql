ALTER TABLE public.match_sets
  ADD COLUMN IF NOT EXISTS team1_points_override smallint,
  ADD COLUMN IF NOT EXISTS team2_points_override smallint;