-- Completed matches (52 total) with real set scores from production
WITH completed_matches(match_num, match_date, match_time, week_num, p1, p2, p3, p4, s1_t1_g1, s1_t2_g1, s2_t1_g1, s2_t2_g1, s3_t1_g1, s3_t2_g1) AS (
  VALUES
),
active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
player_map AS (
  SELECT first_name, id FROM public.players
),
matches_inserted AS (
  INSERT INTO public.matches (season_id, slot_id, week_number, court, status)
  SELECT
    s.id,
    NULL,  -- Will update with actual slot IDs
    m.week_num::smallint,
    'Court A',
    'completed'::public.match_status
  FROM active_season s
  CROSS JOIN completed_matches m
  RETURNING id, (SELECT ROW_NUMBER() OVER (ORDER BY id) FROM public.matches) as match_order
)
-- TODO: Insert match_pairings and match_sets using the parsed data
SELECT count(*) as inserted FROM matches_inserted;