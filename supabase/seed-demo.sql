-- PTC2.0 demo seed (idempotent-ish for first setup)
-- Run in Supabase SQL Editor after schema + RLS are applied.

-- 1) Active season
WITH upsert_season AS (
  INSERT INTO public.seasons (name, start_date, end_date, is_active)
  VALUES ('Summer 2026', '2026-06-01', '2026-09-30', true)
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT 1;

-- If multiple seasons exist, keep only Summer 2026 active for demo clarity.
UPDATE public.seasons
SET is_active = (name = 'Summer 2026');

-- 2) Demo players (not linked to auth yet)
INSERT INTO public.players (first_name, last_name, phone, ntrp_rating, is_active)
VALUES
  ('Alex', 'Rivera', '555-0101', '3.5', true),
  ('Brooke', 'Chen', '555-0102', '3.5', true),
  ('Carlos', 'Nguyen', '555-0103', '4.0', true),
  ('Dana', 'Patel', '555-0104', '3.0', true),
  ('Evan', 'Lopez', '555-0105', '4.0', true),
  ('Farah', 'Khan', '555-0106', '3.5', true),
  ('Gabe', 'Wright', '555-0107', '3.0', true),
  ('Hana', 'Kim', '555-0108', '4.5', true)
ON CONFLICT DO NOTHING;

-- 3) Enroll all active players into active season
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
)
INSERT INTO public.season_players (season_id, player_id, is_captain)
SELECT s.id, p.id, false
FROM active_season s
CROSS JOIN public.players p
WHERE p.is_active = true
ON CONFLICT (season_id, player_id) DO NOTHING;

-- 4) Create availability slots for weeks 1-6
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
)
INSERT INTO public.availability_slots (season_id, label, slot_date, week_number)
SELECT
  s.id,
  CONCAT('Week ', w.week_no, ' - Saturday AM') AS label,
  (DATE '2026-06-07' + ((w.week_no - 1) * 7))::date AS slot_date,
  w.week_no::smallint
FROM active_season s
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) AS w(week_no)
ON CONFLICT DO NOTHING;

-- 5) Mark everyone as available in all slots for initial testing
INSERT INTO public.player_availability (slot_id, player_id, status, note)
SELECT
  sl.id,
  p.id,
  'available'::public.availability_status,
  'Seeded default availability'
FROM public.availability_slots sl
JOIN public.seasons se ON se.id = sl.season_id AND se.is_active = true
JOIN public.players p ON p.is_active = true
ON CONFLICT (slot_id, player_id)
DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now();

-- 6) Create two scheduled demo matches (week 1)
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
week1_slot AS (
  SELECT id FROM public.availability_slots
  WHERE week_number = 1
  ORDER BY created_at ASC
  LIMIT 1
)
INSERT INTO public.matches (season_id, slot_id, week_number, court, status)
SELECT s.id, w.id, 1, c.court_name, 'scheduled'::public.match_status
FROM active_season s
CROSS JOIN week1_slot w
CROSS JOIN (VALUES ('Court 1'), ('Court 2')) AS c(court_name)
ON CONFLICT DO NOTHING;

-- 7) Add pairings for those two matches (first 8 players)
WITH m AS (
  SELECT id, court FROM public.matches
  WHERE week_number = 1
  ORDER BY created_at ASC
  LIMIT 2
),
p AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM public.players
  WHERE is_active = true
  LIMIT 8
)
INSERT INTO public.match_pairings (
  match_id,
  team1_player1_id,
  team1_player2_id,
  team2_player1_id,
  team2_player2_id
)
SELECT
  (SELECT id FROM m WHERE court = 'Court 1' LIMIT 1),
  (SELECT id FROM p WHERE rn = 1),
  (SELECT id FROM p WHERE rn = 2),
  (SELECT id FROM p WHERE rn = 3),
  (SELECT id FROM p WHERE rn = 4)
WHERE EXISTS (SELECT 1 FROM m WHERE court = 'Court 1')
UNION ALL
SELECT
  (SELECT id FROM m WHERE court = 'Court 2' LIMIT 1),
  (SELECT id FROM p WHERE rn = 5),
  (SELECT id FROM p WHERE rn = 6),
  (SELECT id FROM p WHERE rn = 7),
  (SELECT id FROM p WHERE rn = 8)
WHERE EXISTS (SELECT 1 FROM m WHERE court = 'Court 2')
ON CONFLICT DO NOTHING;

-- 8) Build initial standings rows (all zeroes)
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
)
INSERT INTO public.standings_snapshots (season_id, player_id)
SELECT s.id, p.id
FROM active_season s
JOIN public.players p ON p.is_active = true
ON CONFLICT (season_id, player_id) DO NOTHING;

-- Summary checks
SELECT 'season' AS item, count(*) AS total FROM public.seasons WHERE is_active = true
UNION ALL
SELECT 'players', count(*) FROM public.players WHERE is_active = true
UNION ALL
SELECT 'slots', count(*) FROM public.availability_slots
UNION ALL
SELECT 'matches', count(*) FROM public.matches
UNION ALL
SELECT 'pairings', count(*) FROM public.match_pairings
UNION ALL
SELECT 'standings rows', count(*) FROM public.standings_snapshots;
