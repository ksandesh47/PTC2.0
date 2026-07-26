-- PTC2.0 seed from real 1.0 roster and scorecards
-- NOTE: This script intentionally resets seeded player/match data.
-- Run in Supabase SQL Editor.

-- 1) Ensure one active season
INSERT INTO public.seasons (name, start_date, end_date, is_active)
SELECT 'Summer 2026', DATE '2026-05-01', DATE '2026-09-01', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.seasons WHERE name = 'Summer 2026'
);

UPDATE public.seasons
SET is_active = (name = 'Summer 2026');

-- 2) Seed a system recorder user for historical score imports
INSERT INTO public.users (id, email, role)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 'system-seed@palomino.local', 'admin'::public.role
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- 3) Hard reset seeded league data so bogus/demo players are removed
DELETE FROM public.match_sets;
DELETE FROM public.match_pairings;
DELETE FROM public.matches;
DELETE FROM public.player_availability;
DELETE FROM public.availability_slots;
DELETE FROM public.standings_snapshots;
DELETE FROM public.season_players;
DELETE FROM public.players;

-- 4) Insert real player roster with contact info
-- Keep display name in first_name and last_name empty.
WITH roster(player_name, ntrp_rating, phone, email) AS (
  VALUES
    ('Ahad', '3.5', NULL, NULL),
    ('Ankur', '3.0', '978-505-8867', NULL),
    ('Brian', '4.0', '603-486-9395', 'bes1213@yahoo.com'),
    ('Brownie', '3.5', '978-809-2798', 'sbrown@kingpaintinginc.com'),
    ('Connors', '3.0', '603-921-8439', 'sconnors@outlook.com'),
    ('Cruz', '3.5', '603-809-2581', 'scruznh@comcast.net'),
    ('Denny', '3.0', '603-493-0504', 'dv5254dv@gmail.com'),
    ('Doug', '4.0', '603-670-3520', 'dplaidlaw@gmail.com'),
    ('Eric', '4.5', '603-440-4678', 'ericveiga1047@gmail.com'),
    ('Greg', '3.5', '603-714-0319', 'gregorydpickett@gmail.com'),
    ('Henry', '4.0', '603-913-4680', 'hdubois14@gmail.com'),
    ('Jeremy', '3.5', '402-516-2156', 'jdshadroui@yahoo.com'),
    ('Jimmy P', NULL, '6039135274', NULL),
    ('Jon', '3.0', NULL, NULL),
    ('Kevin', '4.0', '603-714-1083', 'kbrankins@yahoo.com'),
    ('Marc', '3.5', '603-264-2458', 'marc.amiet@vanotis.com'),
    ('Mike L', '3.0', '603-660-0913', 'fishlag1@gmail.com'),
    ('Mike M', NULL, '508-330-4187', 'mpmalinowski@gmail.com'),
    ('Raj', '3.5', '732-474-8593', NULL),
    ('Ravi', '3.5', '603-682-8610', 'rajuneja@gmail.com'),
    ('RI Jeff', '3.5', '330-641-8203', 'jeff.vinacco@gmail.com'),
    ('Rob', '3.0', '603-722-8820', 'robgelinas@gmail.com'),
    ('Sandesh', '4.5', '603-858-5861', 'ksandesh47@gmail.com'),
    ('Todd', '4.0', '603-361-5526', 'fitzgeraldtm@yahoo.com'),
    ('Vijay', '3.5', '603-264-7339', NULL)
)
INSERT INTO public.players (first_name, last_name, phone, ntrp_rating, is_active)
SELECT r.player_name, '', r.phone, r.ntrp_rating, true
FROM roster r;

-- 5) Create app user profiles from auth.users where email is known
WITH roster(player_name, email) AS (
  VALUES
    ('Ahad', NULL),
    ('Ankur', NULL),
    ('Brian', 'bes1213@yahoo.com'),
    ('Brownie', 'sbrown@kingpaintinginc.com'),
    ('Connors', 'sconnors@outlook.com'),
    ('Cruz', 'scruznh@comcast.net'),
    ('Denny', 'dv5254dv@gmail.com'),
    ('Doug', 'dplaidlaw@gmail.com'),
    ('Eric', 'ericveiga1047@gmail.com'),
    ('Greg', 'gregorydpickett@gmail.com'),
    ('Henry', 'hdubois14@gmail.com'),
    ('Jeremy', 'jdshadroui@yahoo.com'),
    ('Jimmy P', NULL),
    ('Jon', NULL),
    ('Kevin', 'kbrankins@yahoo.com'),
    ('Marc', 'marc.amiet@vanotis.com'),
    ('Mike L', 'fishlag1@gmail.com'),
    ('Mike M', 'mpmalinowski@gmail.com'),
    ('Raj', NULL),
    ('Ravi', 'rajuneja@gmail.com'),
    ('RI Jeff', 'jeff.vinacco@gmail.com'),
    ('Rob', 'robgelinas@gmail.com'),
    ('Sandesh', 'ksandesh47@gmail.com'),
    ('Todd', 'fitzgeraldtm@yahoo.com'),
    ('Vijay', NULL)
)
INSERT INTO public.users (id, email, role)
SELECT au.id, au.email, 'player'::public.role
FROM roster r
JOIN auth.users au ON lower(au.email) = lower(r.email)
WHERE r.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- 6) Link players to auth users by email
WITH roster(player_name, email) AS (
  VALUES
    ('Ahad', NULL),
    ('Ankur', NULL),
    ('Brian', 'bes1213@yahoo.com'),
    ('Brownie', 'sbrown@kingpaintinginc.com'),
    ('Connors', 'sconnors@outlook.com'),
    ('Cruz', 'scruznh@comcast.net'),
    ('Denny', 'dv5254dv@gmail.com'),
    ('Doug', 'dplaidlaw@gmail.com'),
    ('Eric', 'ericveiga1047@gmail.com'),
    ('Greg', 'gregorydpickett@gmail.com'),
    ('Henry', 'hdubois14@gmail.com'),
    ('Jeremy', 'jdshadroui@yahoo.com'),
    ('Jimmy P', NULL),
    ('Jon', NULL),
    ('Kevin', 'kbrankins@yahoo.com'),
    ('Marc', 'marc.amiet@vanotis.com'),
    ('Mike L', 'fishlag1@gmail.com'),
    ('Mike M', 'mpmalinowski@gmail.com'),
    ('Raj', NULL),
    ('Ravi', 'rajuneja@gmail.com'),
    ('RI Jeff', 'jeff.vinacco@gmail.com'),
    ('Rob', 'robgelinas@gmail.com'),
    ('Sandesh', 'ksandesh47@gmail.com'),
    ('Todd', 'fitzgeraldtm@yahoo.com'),
    ('Vijay', NULL)
)
UPDATE public.players p
SET user_id = au.id
FROM roster r
JOIN auth.users au ON lower(au.email) = lower(r.email)
WHERE r.email IS NOT NULL
  AND p.first_name = r.player_name;

-- 7) Enroll all players into active season
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
)
INSERT INTO public.season_players (season_id, player_id, is_captain)
SELECT s.id, p.id, false
FROM active_season s
JOIN public.players p ON p.is_active = true;

-- 8) Insert real slot windows from 1.0 schedule/results period
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
slots(label, slot_date, week_number) AS (
  SELECT
    trim(to_char(d, 'Dy Mon FMDD')) || ' - 5:30 PM' AS label,
    d AS slot_date,
    (1 + (EXTRACT(DAY FROM (d - DATE '2026-05-01')) / 7))::smallint AS week_number
  FROM generate_series(DATE '2026-05-01', DATE '2026-09-01', INTERVAL '1 day') AS g(d)
  WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5

  UNION ALL

  SELECT
    trim(to_char(d, 'Dy Mon FMDD')) || ' - 8:30 AM' AS label,
    d AS slot_date,
    (1 + (EXTRACT(DAY FROM (d - DATE '2026-05-01')) / 7))::smallint AS week_number
  FROM generate_series(DATE '2026-05-01', DATE '2026-09-01', INTERVAL '1 day') AS g(d)
  WHERE EXTRACT(ISODOW FROM d) IN (6, 7)

  UNION ALL

  SELECT
    trim(to_char(d, 'Dy Mon FMDD')) || ' - 11:00 AM' AS label,
    d AS slot_date,
    (1 + (EXTRACT(DAY FROM (d - DATE '2026-05-01')) / 7))::smallint AS week_number
  FROM generate_series(DATE '2026-05-01', DATE '2026-09-01', INTERVAL '1 day') AS g(d)
  WHERE EXTRACT(ISODOW FROM d) IN (6, 7)
)
INSERT INTO public.availability_slots (season_id, label, slot_date, week_number)
SELECT s.id, x.label, x.slot_date, x.week_number::smallint
FROM active_season s
JOIN slots x ON true;

-- 9) Baseline availability (everyone available)
INSERT INTO public.player_availability (slot_id, player_id, status, note)
SELECT
  sl.id,
  p.id,
  'available'::public.availability_status,
  'Imported baseline from 1.0'
FROM public.availability_slots sl
JOIN public.seasons se ON se.id = sl.season_id AND se.is_active = true
JOIN public.players p ON p.is_active = true;

-- 10) Import 1.0 availability snapshot from Tennis Club.xlsx
-- TRUE -> available, FALSE -> unavailable for matching seeded slots.
WITH imported_availability(player_name, slot_date, slot_idx, is_available, submitted_at) AS (
  VALUES
    ('Ahad', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Ahad', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:49:52.862Z'),
    ('Brian', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-02', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brian', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:53:14.971Z'),
    ('Brownie', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-21', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-02', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-03', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-05', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-05', 1, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Brownie', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:43:01.850Z'),
    ('Connors', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Connors', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:47:08.683Z'),
    ('Cruz', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-13', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-20', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-20', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-21', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-27', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-03', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-04', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-04', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-05', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-05', 1, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Cruz', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:56:29.102Z'),
    ('Doug', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.900Z'),
    ('Doug', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-21', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Doug', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:45:32.901Z'),
    ('Eric', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-13', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-20', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-20', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-21', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-27', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-02', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-03', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-04', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-04', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-05', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-05', 1, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Eric', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:47:49.390Z'),
    ('Greg', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Greg', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:49:26.639Z'),
    ('Henry', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-13', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-20', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-20', 1, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-21', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-27', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Henry', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:44:37.250Z'),
    ('Jeremy', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-13', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-27', 0, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.168Z'),
    ('Jeremy', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jeremy', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:54:48.169Z'),
    ('Jon', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Jon', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:53:59.190Z'),
    ('Kevin', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.597Z'),
    ('Kevin', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.597Z'),
    ('Kevin', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-20', 1, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Kevin', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:48:40.598Z'),
    ('Marc', DATE '2026-06-08', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-10', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Marc', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:46:50.746Z'),
    ('Mike L', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-11', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-12', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-13', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-14', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-26', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Mike L', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:53:42.499Z'),
    ('Raj', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-08', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-09', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-10', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-11', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-11', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-12', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-12', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-13', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-14', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-15', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-16', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-17', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-18', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-18', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-19', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-19', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-20', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-21', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-22', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-23', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-24', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-25', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-25', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-26', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-26', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-27', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-28', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-29', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-30', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-07-31', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-01', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-01', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-02', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-02', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-03', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-04', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-05', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-06', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-07', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-08', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-08', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-09', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-09', 1, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-10', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-11', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-12', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Raj', DATE '2026-08-13', 0, false, TIMESTAMPTZ '2026-06-15T17:21:30.686Z'),
    ('Rob', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-13', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-14', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-20', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-02', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-03', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-04', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-05', 1, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Rob', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:58:19.215Z'),
    ('Sandesh', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-22', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-24', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-25', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-27', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-27', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.218Z'),
    ('Sandesh', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-03', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-08', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-09', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-10', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-11', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-11', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-12', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-12', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-13', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-14', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-15', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-16', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-17', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-18', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-18', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-19', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-19', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-20', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-21', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-22', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-23', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-24', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-25', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-25', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-26', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-26', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-27', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-28', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-29', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-30', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-07-31', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-01', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-01', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-02', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-02', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-03', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-04', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-05', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-06', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-07', 0, true, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-08', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-08', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-09', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-09', 1, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-10', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-11', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-12', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Sandesh', DATE '2026-08-13', 0, false, TIMESTAMPTZ '2026-06-15T15:54:56.219Z'),
    ('Todd', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-09', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-13', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-15', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-16', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-17', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-18', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-19', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-20', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-20', 1, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-21', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-21', 1, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-23', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-27', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-28', 0, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-28', 1, true, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-29', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-06-30', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-01', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-02', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-03', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-04', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-04', 1, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-05', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-05', 1, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-06', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Todd', DATE '2026-07-07', 0, false, TIMESTAMPTZ '2026-06-08T19:46:24.420Z'),
    ('Vijay', DATE '2026-06-08', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-09', 0, false, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-10', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-11', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-12', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-13', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-13', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-14', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-14', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-15', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-16', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-17', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-18', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-19', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-20', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-20', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-21', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-21', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-22', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-23', 0, false, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-24', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-25', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-26', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-27', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-27', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-28', 0, false, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-28', 1, false, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-29', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-06-30', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-01', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-02', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-03', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-04', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-04', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-05', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-05', 1, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-06', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z'),
    ('Vijay', DATE '2026-07-07', 0, true, TIMESTAMPTZ '2026-06-08T19:57:16.504Z')
),
resolved AS (
  SELECT
    sl.id AS slot_id,
    p.id AS player_id,
    CASE WHEN i.is_available THEN 'available'::public.availability_status ELSE 'unavailable'::public.availability_status END AS status,
    i.submitted_at
  FROM imported_availability i
  JOIN public.seasons s ON s.is_active = true
  JOIN public.players p ON p.first_name = i.player_name
  JOIN public.availability_slots sl
    ON sl.season_id = s.id
   AND sl.slot_date = i.slot_date
   AND (
        (i.slot_idx = 0 AND sl.label LIKE '%5:30 PM%' AND EXTRACT(ISODOW FROM sl.slot_date) BETWEEN 1 AND 5)
     OR (i.slot_idx = 0 AND sl.label LIKE '%8:30 AM%')
     OR (i.slot_idx = 1 AND sl.label LIKE '%11:00 AM%')
   )
)
INSERT INTO public.player_availability (slot_id, player_id, status, note)
SELECT
  r.slot_id,
  r.player_id,
  r.status,
  'Imported from 1.0 workbook on 2026-06-18'
FROM resolved r
ON CONFLICT (slot_id, player_id) DO UPDATE
SET
  status = EXCLUDED.status,
  note = EXCLUDED.note,
  updated_at = now();
-- 11) Seed completed + scheduled matches
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
match_specs(slot_label, week_number, court, status) AS (
  VALUES
    ('Mon Jun 15 - 5:30 PM', 3, 'Court A', 'completed'::public.match_status),
    ('Sun Jun 14 - 8:30 AM', 2, 'Court A', 'completed'::public.match_status),
    ('Sat Jun 13 - 8:30 AM', 2, 'Court A', 'completed'::public.match_status),
    ('Tue Jun 16 - 5:30 PM', 3, 'Court A', 'scheduled'::public.match_status),
    ('Wed Jun 17 - 5:30 PM', 3, 'Court A', 'scheduled'::public.match_status),
    ('Thu Jun 18 - 5:30 PM', 3, 'Court A', 'scheduled'::public.match_status),
    ('Fri Jun 19 - 5:30 PM', 3, 'Court A', 'scheduled'::public.match_status),
    ('Sat Jun 20 - 11:00 AM', 3, 'Court A', 'scheduled'::public.match_status)
)
INSERT INTO public.matches (season_id, slot_id, week_number, court, status)
SELECT s.id, sl.id, m.week_number::smallint, m.court, m.status
FROM active_season s
JOIN match_specs m ON true
JOIN public.availability_slots sl
  ON sl.season_id = s.id
 AND sl.label = m.slot_label;

-- 12) Scheduled lineups (real from 1.0 schedule view)
WITH scheduled_lineups(slot_label, p1, p2, p3, p4) AS (
  VALUES
    ('Tue Jun 16 - 5:30 PM', 'Ahad', 'Brownie', 'Cruz', 'Kevin'),
    ('Wed Jun 17 - 5:30 PM', 'Brian', 'Henry', 'Marc', 'Raj'),
    ('Thu Jun 18 - 5:30 PM', 'Denny', 'Doug', 'Jeremy', 'Vijay'),
    ('Fri Jun 19 - 5:30 PM', 'Brownie', 'Greg', 'Henry', 'Kevin'),
    ('Sat Jun 20 - 11:00 AM', 'Eric', 'Ravi', 'Rob', 'Vijay')
),
resolved AS (
  SELECT
    m.id AS match_id,
    p1.id AS p1_id,
    p2.id AS p2_id,
    p3.id AS p3_id,
    p4.id AS p4_id
  FROM scheduled_lineups l
  JOIN public.seasons s ON s.is_active = true
  JOIN public.availability_slots sl ON sl.season_id = s.id AND sl.label = l.slot_label
  JOIN public.matches m ON m.season_id = s.id AND m.slot_id = sl.id AND m.status = 'scheduled'
  JOIN public.players p1 ON p1.first_name = l.p1
  JOIN public.players p2 ON p2.first_name = l.p2
  JOIN public.players p3 ON p3.first_name = l.p3
  JOIN public.players p4 ON p4.first_name = l.p4
)
INSERT INTO public.match_pairings (
  match_id,
  team1_player1_id,
  team1_player2_id,
  team2_player1_id,
  team2_player2_id
)
SELECT r.match_id, r.p1_id, r.p2_id, r.p3_id, r.p4_id
FROM resolved r;

-- 13) Import 52 completed matches from production (May 4 - Jul 25, 2026)
-- Step 1: Insert all match records
INSERT INTO public.matches (season_id, slot_id, week_number, court, status)
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
match_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (
  VALUES
    (52, DATE '2026-07-25', TIME '11:00:00', 'Todd', 'Ahad', 'Henry', 'Kevin', 4, 6, 6, 3, 6, 3),
    (51, DATE '2026-07-24', TIME '17:30:00', 'Brownie', 'Cruz', 'Sandesh', 'Todd', 4, 6, 0, 6, 6, 4),
    (50, DATE '2026-07-23', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'RI Jeff', 4, 6, 2, 6, 1, 6),
    (49, DATE '2026-07-22', TIME '17:30:00', 'Mike L', 'Vijay', 'Eric', 'Raj', 2, 6, 2, 6, 6, 7),
    (48, DATE '2026-07-20', TIME '17:30:00', 'Connors', 'Cruz', 'Raj', 'Jon', 1, 6, 3, 6, 4, 6),
    (47, DATE '2026-07-18', TIME '08:30:00', 'Henry', 'Kevin', 'Cruz', 'Raj', 5, 7, 6, 3, 6, 0),
    (46, DATE '2026-07-17', TIME '17:30:00', 'Henry', 'Raj', 'Sandesh', 'Kevin', 7, 5, 2, 6, 6, 4),
    (45, DATE '2026-07-16', TIME '17:30:00', 'Brian', 'Denny', 'Vijay', 'Jeremy', 6, 4, 2, 6, 6, 1),
    (44, DATE '2026-07-15', TIME '17:30:00', 'Brownie', 'Doug', 'Marc', 'Raj', 2, 6, 1, 6, 6, 4),
    (43, DATE '2026-07-14', TIME '17:30:00', 'Ahad', 'Brian', 'Vijay', 'Jeremy', 6, 7, 4, 6, 7, 6),
    (42, DATE '2026-07-13', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob', 6, 4, 6, 4, 6, 3),
    (41, DATE '2026-07-11', TIME '08:30:00', 'Henry', 'Raj', 'Brownie', 'Kevin', 6, 4, 3, 6, 6, 1),
    (40, DATE '2026-07-10', TIME '17:30:00', 'Raj', 'Sandesh', 'Todd', 'Vijay', 1, 6, 1, 6, 0, 6),
    (39, DATE '2026-07-09', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'Marc', 6, 3, 1, 6, 0, 6),
    (38, DATE '2026-07-08', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Vijay', 6, 4, 6, 2, 6, 2),
    (37, DATE '2026-07-06', TIME '17:30:00', 'Connors', 'Henry', 'Jon', 'Mike L', 6, 0, 0, 6, 3, 6),
    (36, DATE '2026-07-03', TIME '17:30:00', 'Doug', 'Greg', 'Sandesh', 'Todd', 2, 6, 1, 6, 3, 6),
    (35, DATE '2026-07-01', TIME '17:30:00', 'Brian', 'Greg', 'Marc', 'Raj', 7, 6, 4, 6, 2, 6),
    (34, DATE '2026-06-30', TIME '17:30:00', 'Brian', 'Eric', 'Ahad', 'Raj', 6, 3, 6, 2, 4, 6),
    (33, DATE '2026-06-29', TIME '17:30:00', 'Connors', 'Greg', 'Kevin', 'Raj', 3, 6, 0, 6, 4, 6),
    (32, DATE '2026-06-28', TIME '08:30:00', 'Cruz', 'Doug', 'Raj', 'Mike L', 3, 6, 6, 2, 6, 1),
    (31, DATE '2026-06-27', TIME '11:00:00', 'Eric', 'Jeremy', 'Ravi', 'Rob', 6, 1, 6, 1, 6, 2),
    (30, DATE '2026-06-25', TIME '17:30:00', 'Brownie', 'Denny', 'Kevin', 'RI Jeff', 0, 6, 4, 6, 7, 5),
    (29, DATE '2026-06-24', TIME '17:30:00', 'Marc', 'Ravi', 'Vijay', 'Mike L', 0, 6, 6, 1, 1, 6),
    (28, DATE '2026-06-23', TIME '17:30:00', 'Todd', 'Ahad', 'Cruz', 'Jeremy', 6, 1, 6, 1, 6, 0),
    (27, DATE '2026-06-20', TIME '11:00:00', 'Eric', 'Rob', 'Vijay', 'Mike L', 6, 1, 6, 1, 6, 3),
    (26, DATE '2026-06-19', TIME '17:30:00', 'Brownie', 'Greg', 'Henry', 'Denny', 5, 7, 6, 4, 0, 6),
    (25, DATE '2026-06-17', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Mike L', 6, 4, 2, 6, 6, 4),
    (24, DATE '2026-06-16', TIME '17:30:00', 'Ahad', 'Brownie', 'Cruz', 'Kevin', 4, 6, 2, 6, 6, 1),
    (23, DATE '2026-06-15', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob', 6, 2, 6, 4, 1, 6),
    (22, DATE '2026-06-14', TIME '08:30:00', 'Brownie', 'Doug', 'Todd', 'Vijay', 1, 6, 6, 4, 0, 6),
    (21, DATE '2026-06-13', TIME '08:30:00', 'Henry', 'Jeremy', 'Todd', 'Vijay', 2, 6, 6, 0, 6, 7),
    (20, DATE '2026-06-12', TIME '17:30:00', 'Vijay', 'Sandesh', 'Denny', 'Raj', 3, 6, 6, 1, 2, 6),
    (19, DATE '2026-06-11', TIME '17:30:00', 'Brian', 'Doug', 'Jeremy', 'Kevin', 6, 7, 4, 6, 6, 7),
    (18, DATE '2026-06-09', TIME '17:30:00', 'Brian', 'Jeremy', 'Ahad', 'Brownie', 7, 5, 6, 2, 6, 1),
    (17, DATE '2026-06-08', TIME '17:30:00', 'Doug', 'Kevin', 'Eric', 'Connors', 6, 1, 6, 4, 1, 6),
    (16, DATE '2026-06-05', TIME '17:30:00', 'Ahad', 'Eric', 'Greg', 'Sandesh', 1, 6, 2, 6, 6, 4),
    (15, DATE '2026-05-27', TIME '17:30:00', 'Brian', 'Eric', 'Rob', 'Todd', 6, 4, 0, 6, 6, 2),
    (14, DATE '2026-05-26', TIME '17:30:00', 'Ahad', 'Brian', 'Cruz', 'Jeremy', 6, 2, 6, 4, 6, 3),
    (13, DATE '2026-05-25', TIME '17:30:00', 'Cruz', 'Eric', 'Jon', 'Rob', 6, 4, 3, 6, 6, 7),
    (12, DATE '2026-05-23', TIME '08:30:00', 'Brownie', 'Henry', 'Jeremy', 'Sandesh', 1, 6, 1, 6, 4, 6),
    (11, DATE '2026-05-22', TIME '17:30:00', 'Eric', 'Greg', 'Kevin', 'Sandesh', 3, 6, 4, 6, 3, 6),
    (10, DATE '2026-05-21', TIME '17:30:00', 'Brownie', 'Denny', 'Henry', 'Jeremy', 1, 6, 6, 0, 2, 6),
    (9, DATE '2026-05-20', TIME '17:30:00', 'Brian', 'Eric', 'Greg', 'Kevin', 3, 6, 6, 1, 6, 3),
    (8, DATE '2026-05-18', TIME '17:30:00', 'Connors', 'Doug', 'Jon', 'Sandesh', 3, 6, 1, 6, 6, 3),
    (7, DATE '2026-05-17', TIME '08:30:00', 'Brownie', 'Cruz', 'Doug', 'Rob', 6, 3, 6, 3, 3, 6),
    (6, DATE '2026-05-16', TIME '08:30:00', 'Doug', 'Eric', 'Henry', 'Mike L', 6, 3, 6, 3, 2, 6),
    (5, DATE '2026-05-15', TIME '17:30:00', 'Greg', 'Kevin', 'Todd', 'Sandesh', 2, 6, 4, 6, 7, 5),
    (4, DATE '2026-05-12', TIME '17:30:00', 'Ahad', 'Brian', 'Eric', 'Todd', 0, 6, 0, 6, 6, 3),
    (3, DATE '2026-05-08', TIME '17:30:00', 'Eric', 'RI Jeff', 'Sandesh', 'Todd', 1, 6, 6, 7, 5, 7),
    (2, DATE '2026-05-05', TIME '17:30:00', 'Brownie', 'Denny', 'Doug', 'RI Jeff', 2, 6, 6, 1, 6, 4),
    (1, DATE '2026-05-04', TIME '17:30:00', 'Connors', 'Cruz', 'Eric', 'Denny', 2, 6, 6, 4, 0, 6)
),
with_slots AS (
  SELECT
    m.match_num,
    m.match_date,
    m.match_time,
    m.p1, m.p2, m.p3, m.p4,
    m.s1_t1_g, m.s1_t2_g, m.s2_t1_g, m.s2_t2_g, m.s3_t1_g, m.s3_t2_g,
    (SELECT id FROM public.availability_slots 
     WHERE season_id = (SELECT id FROM active_season) 
     AND slot_date = m.match_date 
     LIMIT 1) AS slot_id
  FROM match_data m
)
SELECT
  (SELECT id FROM active_season),
  slot_id,
  EXTRACT(WEEK FROM match_date)::smallint - 17 + 1,
  'Court A',
  'completed'::public.match_status
FROM with_slots;

-- 13b) Insert match pairings for all 52 completed matches
WITH match_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (
  VALUES
    (52, DATE '2026-07-25', TIME '11:00:00', 'Todd', 'Ahad', 'Henry', 'Kevin', 4, 6, 6, 3, 6, 3),
    (51, DATE '2026-07-24', TIME '17:30:00', 'Brownie', 'Cruz', 'Sandesh', 'Todd', 4, 6, 0, 6, 6, 4),
    (50, DATE '2026-07-23', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'RI Jeff', 4, 6, 2, 6, 1, 6),
    (49, DATE '2026-07-22', TIME '17:30:00', 'Mike L', 'Vijay', 'Eric', 'Raj', 2, 6, 2, 6, 6, 7),
    (48, DATE '2026-07-20', TIME '17:30:00', 'Connors', 'Cruz', 'Raj', 'Jon', 1, 6, 3, 6, 4, 6),
    (47, DATE '2026-07-18', TIME '08:30:00', 'Henry', 'Kevin', 'Cruz', 'Raj', 5, 7, 6, 3, 6, 0),
    (46, DATE '2026-07-17', TIME '17:30:00', 'Henry', 'Raj', 'Sandesh', 'Kevin', 7, 5, 2, 6, 6, 4),
    (45, DATE '2026-07-16', TIME '17:30:00', 'Brian', 'Denny', 'Vijay', 'Jeremy', 6, 4, 2, 6, 6, 1),
    (44, DATE '2026-07-15', TIME '17:30:00', 'Brownie', 'Doug', 'Marc', 'Raj', 2, 6, 1, 6, 6, 4),
    (43, DATE '2026-07-14', TIME '17:30:00', 'Ahad', 'Brian', 'Vijay', 'Jeremy', 6, 7, 4, 6, 7, 6),
    (42, DATE '2026-07-13', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob', 6, 4, 6, 4, 6, 3),
    (41, DATE '2026-07-11', TIME '08:30:00', 'Henry', 'Raj', 'Brownie', 'Kevin', 6, 4, 3, 6, 6, 1),
    (40, DATE '2026-07-10', TIME '17:30:00', 'Raj', 'Sandesh', 'Todd', 'Vijay', 1, 6, 1, 6, 0, 6),
    (39, DATE '2026-07-09', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'Marc', 6, 3, 1, 6, 0, 6),
    (38, DATE '2026-07-08', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Vijay', 6, 4, 6, 2, 6, 2),
    (37, DATE '2026-07-06', TIME '17:30:00', 'Connors', 'Henry', 'Jon', 'Mike L', 6, 0, 0, 6, 3, 6),
    (36, DATE '2026-07-03', TIME '17:30:00', 'Doug', 'Greg', 'Sandesh', 'Todd', 2, 6, 1, 6, 3, 6),
    (35, DATE '2026-07-01', TIME '17:30:00', 'Brian', 'Greg', 'Marc', 'Raj', 7, 6, 4, 6, 2, 6),
    (34, DATE '2026-06-30', TIME '17:30:00', 'Brian', 'Eric', 'Ahad', 'Raj', 6, 3, 6, 2, 4, 6),
    (33, DATE '2026-06-29', TIME '17:30:00', 'Connors', 'Greg', 'Kevin', 'Raj', 3, 6, 0, 6, 4, 6),
    (32, DATE '2026-06-28', TIME '08:30:00', 'Cruz', 'Doug', 'Raj', 'Mike L', 3, 6, 6, 2, 6, 1),
    (31, DATE '2026-06-27', TIME '11:00:00', 'Eric', 'Jeremy', 'Ravi', 'Rob', 6, 1, 6, 1, 6, 2),
    (30, DATE '2026-06-25', TIME '17:30:00', 'Brownie', 'Denny', 'Kevin', 'RI Jeff', 0, 6, 4, 6, 7, 5),
    (29, DATE '2026-06-24', TIME '17:30:00', 'Marc', 'Ravi', 'Vijay', 'Mike L', 0, 6, 6, 1, 1, 6),
    (28, DATE '2026-06-23', TIME '17:30:00', 'Todd', 'Ahad', 'Cruz', 'Jeremy', 6, 1, 6, 1, 6, 0),
    (27, DATE '2026-06-20', TIME '11:00:00', 'Eric', 'Rob', 'Vijay', 'Mike L', 6, 1, 6, 1, 6, 3),
    (26, DATE '2026-06-19', TIME '17:30:00', 'Brownie', 'Greg', 'Henry', 'Denny', 5, 7, 6, 4, 0, 6),
    (25, DATE '2026-06-17', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Mike L', 6, 4, 2, 6, 6, 4),
    (24, DATE '2026-06-16', TIME '17:30:00', 'Ahad', 'Brownie', 'Cruz', 'Kevin', 4, 6, 2, 6, 6, 1),
    (23, DATE '2026-06-15', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob', 6, 2, 6, 4, 1, 6),
    (22, DATE '2026-06-14', TIME '08:30:00', 'Brownie', 'Doug', 'Todd', 'Vijay', 1, 6, 6, 4, 0, 6),
    (21, DATE '2026-06-13', TIME '08:30:00', 'Henry', 'Jeremy', 'Todd', 'Vijay', 2, 6, 6, 0, 6, 7),
    (20, DATE '2026-06-12', TIME '17:30:00', 'Vijay', 'Sandesh', 'Denny', 'Raj', 3, 6, 6, 1, 2, 6),
    (19, DATE '2026-06-11', TIME '17:30:00', 'Brian', 'Doug', 'Jeremy', 'Kevin', 6, 7, 4, 6, 6, 7),
    (18, DATE '2026-06-09', TIME '17:30:00', 'Brian', 'Jeremy', 'Ahad', 'Brownie', 7, 5, 6, 2, 6, 1),
    (17, DATE '2026-06-08', TIME '17:30:00', 'Doug', 'Kevin', 'Eric', 'Connors', 6, 1, 6, 4, 1, 6),
    (16, DATE '2026-06-05', TIME '17:30:00', 'Ahad', 'Eric', 'Greg', 'Sandesh', 1, 6, 2, 6, 6, 4),
    (15, DATE '2026-05-27', TIME '17:30:00', 'Brian', 'Eric', 'Rob', 'Todd', 6, 4, 0, 6, 6, 2),
    (14, DATE '2026-05-26', TIME '17:30:00', 'Ahad', 'Brian', 'Cruz', 'Jeremy', 6, 2, 6, 4, 6, 3),
    (13, DATE '2026-05-25', TIME '17:30:00', 'Cruz', 'Eric', 'Jon', 'Rob', 6, 4, 3, 6, 6, 7),
    (12, DATE '2026-05-23', TIME '08:30:00', 'Brownie', 'Henry', 'Jeremy', 'Sandesh', 1, 6, 1, 6, 4, 6),
    (11, DATE '2026-05-22', TIME '17:30:00', 'Eric', 'Greg', 'Kevin', 'Sandesh', 3, 6, 4, 6, 3, 6),
    (10, DATE '2026-05-21', TIME '17:30:00', 'Brownie', 'Denny', 'Henry', 'Jeremy', 1, 6, 6, 0, 2, 6),
    (9, DATE '2026-05-20', TIME '17:30:00', 'Brian', 'Eric', 'Greg', 'Kevin', 3, 6, 6, 1, 6, 3),
    (8, DATE '2026-05-18', TIME '17:30:00', 'Connors', 'Doug', 'Jon', 'Sandesh', 3, 6, 1, 6, 6, 3),
    (7, DATE '2026-05-17', TIME '08:30:00', 'Brownie', 'Cruz', 'Doug', 'Rob', 6, 3, 6, 3, 3, 6),
    (6, DATE '2026-05-16', TIME '08:30:00', 'Doug', 'Eric', 'Henry', 'Mike L', 6, 3, 6, 3, 2, 6),
    (5, DATE '2026-05-15', TIME '17:30:00', 'Greg', 'Kevin', 'Todd', 'Sandesh', 2, 6, 4, 6, 7, 5),
    (4, DATE '2026-05-12', TIME '17:30:00', 'Ahad', 'Brian', 'Eric', 'Todd', 0, 6, 0, 6, 6, 3),
    (3, DATE '2026-05-08', TIME '17:30:00', 'Eric', 'RI Jeff', 'Sandesh', 'Todd', 1, 6, 6, 7, 5, 7),
    (2, DATE '2026-05-05', TIME '17:30:00', 'Brownie', 'Denny', 'Doug', 'RI Jeff', 2, 6, 6, 1, 6, 4),
    (1, DATE '2026-05-04', TIME '17:30:00', 'Connors', 'Cruz', 'Eric', 'Denny', 2, 6, 6, 4, 0, 6)
),
resolved_matches AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY m.match_num DESC) AS match_order,
    p1.id AS p1_id,
    p2.id AS p2_id,
    p3.id AS p3_id,
    p4.id AS p4_id,
    m.s1_t1_g, m.s1_t2_g,
    m.s2_t1_g, m.s2_t2_g,
    m.s3_t1_g, m.s3_t2_g
  FROM match_data m
  JOIN public.players p1 ON p1.first_name = m.p1
  JOIN public.players p2 ON p2.first_name = m.p2
  JOIN public.players p3 ON p3.first_name = m.p3
  JOIN public.players p4 ON p4.first_name = m.p4
),
match_ids AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id DESC) AS match_order, id
  FROM public.matches
  WHERE status = 'completed'
  ORDER BY id DESC
  LIMIT 52
),
combined AS (
  SELECT rm.*, mi.id AS match_id
  FROM resolved_matches rm
  JOIN match_ids mi ON rm.match_order = mi.match_order
)
INSERT INTO public.match_pairings (match_id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id)
SELECT match_id, p1_id, p2_id, p3_id, p4_id
FROM combined;

-- 13c) Insert match sets for all 52 completed matches
WITH match_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (
  VALUES
    (52, DATE '2026-07-25', TIME '11:00:00', 'Todd', 'Ahad', 'Henry', 'Kevin', 4, 6, 6, 3, 6, 3),
    (51, DATE '2026-07-24', TIME '17:30:00', 'Brownie', 'Cruz', 'Sandesh', 'Todd', 4, 6, 0, 6, 6, 4),
    (50, DATE '2026-07-23', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'RI Jeff', 4, 6, 2, 6, 1, 6),
    (49, DATE '2026-07-22', TIME '17:30:00', 'Mike L', 'Vijay', 'Eric', 'Raj', 2, 6, 2, 6, 6, 7),
    (48, DATE '2026-07-20', TIME '17:30:00', 'Connors', 'Cruz', 'Raj', 'Jon', 1, 6, 3, 6, 4, 6),
    (47, DATE '2026-07-18', TIME '08:30:00', 'Henry', 'Kevin', 'Cruz', 'Raj', 5, 7, 6, 3, 6, 0),
    (46, DATE '2026-07-17', TIME '17:30:00', 'Henry', 'Raj', 'Sandesh', 'Kevin', 7, 5, 2, 6, 6, 4),
    (45, DATE '2026-07-16', TIME '17:30:00', 'Brian', 'Denny', 'Vijay', 'Jeremy', 6, 4, 2, 6, 6, 1),
    (44, DATE '2026-07-15', TIME '17:30:00', 'Brownie', 'Doug', 'Marc', 'Raj', 2, 6, 1, 6, 6, 4),
    (43, DATE '2026-07-14', TIME '17:30:00', 'Ahad', 'Brian', 'Vijay', 'Jeremy', 6, 7, 4, 6, 7, 6),
    (42, DATE '2026-07-13', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob', 6, 4, 6, 4, 6, 3),
    (41, DATE '2026-07-11', TIME '08:30:00', 'Henry', 'Raj', 'Brownie', 'Kevin', 6, 4, 3, 6, 6, 1),
    (40, DATE '2026-07-10', TIME '17:30:00', 'Raj', 'Sandesh', 'Todd', 'Vijay', 1, 6, 1, 6, 0, 6),
    (39, DATE '2026-07-09', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'Marc', 6, 3, 1, 6, 0, 6),
    (38, DATE '2026-07-08', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Vijay', 6, 4, 6, 2, 6, 2),
    (37, DATE '2026-07-06', TIME '17:30:00', 'Connors', 'Henry', 'Jon', 'Mike L', 6, 0, 0, 6, 3, 6),
    (36, DATE '2026-07-03', TIME '17:30:00', 'Doug', 'Greg', 'Sandesh', 'Todd', 2, 6, 1, 6, 3, 6),
    (35, DATE '2026-07-01', TIME '17:30:00', 'Brian', 'Greg', 'Marc', 'Raj', 7, 6, 4, 6, 2, 6),
    (34, DATE '2026-06-30', TIME '17:30:00', 'Brian', 'Eric', 'Ahad', 'Raj', 6, 3, 6, 2, 4, 6),
    (33, DATE '2026-06-29', TIME '17:30:00', 'Connors', 'Greg', 'Kevin', 'Raj', 3, 6, 0, 6, 4, 6),
    (32, DATE '2026-06-28', TIME '08:30:00', 'Cruz', 'Doug', 'Raj', 'Mike L', 3, 6, 6, 2, 6, 1),
    (31, DATE '2026-06-27', TIME '11:00:00', 'Eric', 'Jeremy', 'Ravi', 'Rob', 6, 1, 6, 1, 6, 2),
    (30, DATE '2026-06-25', TIME '17:30:00', 'Brownie', 'Denny', 'Kevin', 'RI Jeff', 0, 6, 4, 6, 7, 5),
    (29, DATE '2026-06-24', TIME '17:30:00', 'Marc', 'Ravi', 'Vijay', 'Mike L', 0, 6, 6, 1, 1, 6),
    (28, DATE '2026-06-23', TIME '17:30:00', 'Todd', 'Ahad', 'Cruz', 'Jeremy', 6, 1, 6, 1, 6, 0),
    (27, DATE '2026-06-20', TIME '11:00:00', 'Eric', 'Rob', 'Vijay', 'Mike L', 6, 1, 6, 1, 6, 3),
    (26, DATE '2026-06-19', TIME '17:30:00', 'Brownie', 'Greg', 'Henry', 'Denny', 5, 7, 6, 4, 0, 6),
    (25, DATE '2026-06-17', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Mike L', 6, 4, 2, 6, 6, 4),
    (24, DATE '2026-06-16', TIME '17:30:00', 'Ahad', 'Brownie', 'Cruz', 'Kevin', 4, 6, 2, 6, 6, 1),
    (23, DATE '2026-06-15', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob', 6, 2, 6, 4, 1, 6),
    (22, DATE '2026-06-14', TIME '08:30:00', 'Brownie', 'Doug', 'Todd', 'Vijay', 1, 6, 6, 4, 0, 6),
    (21, DATE '2026-06-13', TIME '08:30:00', 'Henry', 'Jeremy', 'Todd', 'Vijay', 2, 6, 6, 0, 6, 7),
    (20, DATE '2026-06-12', TIME '17:30:00', 'Vijay', 'Sandesh', 'Denny', 'Raj', 3, 6, 6, 1, 2, 6),
    (19, DATE '2026-06-11', TIME '17:30:00', 'Brian', 'Doug', 'Jeremy', 'Kevin', 6, 7, 4, 6, 6, 7),
    (18, DATE '2026-06-09', TIME '17:30:00', 'Brian', 'Jeremy', 'Ahad', 'Brownie', 7, 5, 6, 2, 6, 1),
    (17, DATE '2026-06-08', TIME '17:30:00', 'Doug', 'Kevin', 'Eric', 'Connors', 6, 1, 6, 4, 1, 6),
    (16, DATE '2026-06-05', TIME '17:30:00', 'Ahad', 'Eric', 'Greg', 'Sandesh', 1, 6, 2, 6, 6, 4),
    (15, DATE '2026-05-27', TIME '17:30:00', 'Brian', 'Eric', 'Rob', 'Todd', 6, 4, 0, 6, 6, 2),
    (14, DATE '2026-05-26', TIME '17:30:00', 'Ahad', 'Brian', 'Cruz', 'Jeremy', 6, 2, 6, 4, 6, 3),
    (13, DATE '2026-05-25', TIME '17:30:00', 'Cruz', 'Eric', 'Jon', 'Rob', 6, 4, 3, 6, 6, 7),
    (12, DATE '2026-05-23', TIME '08:30:00', 'Brownie', 'Henry', 'Jeremy', 'Sandesh', 1, 6, 1, 6, 4, 6),
    (11, DATE '2026-05-22', TIME '17:30:00', 'Eric', 'Greg', 'Kevin', 'Sandesh', 3, 6, 4, 6, 3, 6),
    (10, DATE '2026-05-21', TIME '17:30:00', 'Brownie', 'Denny', 'Henry', 'Jeremy', 1, 6, 6, 0, 2, 6),
    (9, DATE '2026-05-20', TIME '17:30:00', 'Brian', 'Eric', 'Greg', 'Kevin', 3, 6, 6, 1, 6, 3),
    (8, DATE '2026-05-18', TIME '17:30:00', 'Connors', 'Doug', 'Jon', 'Sandesh', 3, 6, 1, 6, 6, 3),
    (7, DATE '2026-05-17', TIME '08:30:00', 'Brownie', 'Cruz', 'Doug', 'Rob', 6, 3, 6, 3, 3, 6),
    (6, DATE '2026-05-16', TIME '08:30:00', 'Doug', 'Eric', 'Henry', 'Mike L', 6, 3, 6, 3, 2, 6),
    (5, DATE '2026-05-15', TIME '17:30:00', 'Greg', 'Kevin', 'Todd', 'Sandesh', 2, 6, 4, 6, 7, 5),
    (4, DATE '2026-05-12', TIME '17:30:00', 'Ahad', 'Brian', 'Eric', 'Todd', 0, 6, 0, 6, 6, 3),
    (3, DATE '2026-05-08', TIME '17:30:00', 'Eric', 'RI Jeff', 'Sandesh', 'Todd', 1, 6, 6, 7, 5, 7),
    (2, DATE '2026-05-05', TIME '17:30:00', 'Brownie', 'Denny', 'Doug', 'RI Jeff', 2, 6, 6, 1, 6, 4),
    (1, DATE '2026-05-04', TIME '17:30:00', 'Connors', 'Cruz', 'Eric', 'Denny', 2, 6, 6, 4, 0, 6)
),
resolved_matches AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY m.match_num DESC) AS match_order,
    p1.id AS p1_id,
    p2.id AS p2_id,
    p3.id AS p3_id,
    p4.id AS p4_id,
    m.s1_t1_g, m.s1_t2_g,
    m.s2_t1_g, m.s2_t2_g,
    m.s3_t1_g, m.s3_t2_g
  FROM match_data m
  JOIN public.players p1 ON p1.first_name = m.p1
  JOIN public.players p2 ON p2.first_name = m.p2
  JOIN public.players p3 ON p3.first_name = m.p3
  JOIN public.players p4 ON p4.first_name = m.p4
),
match_ids AS (
  SELECT ROW_NUMBER() OVER (ORDER BY id DESC) AS match_order, id
  FROM public.matches
  WHERE status = 'completed'
  ORDER BY id DESC
  LIMIT 52
),
combined AS (
  SELECT rm.*, mi.id AS match_id
  FROM resolved_matches rm
  JOIN match_ids mi ON rm.match_order = mi.match_order
),
pairings_data AS (
  SELECT mp.id, mp.match_id
  FROM public.match_pairings mp
  WHERE mp.match_id IN (SELECT id FROM public.matches WHERE status = 'completed' ORDER BY id DESC LIMIT 52)
)
INSERT INTO public.match_sets (match_id, pairing_id, set_number, team1_games, team2_games, version, recorded_by)
SELECT c.match_id, pd.id, 1::smallint, c.s1_t1_g::smallint, c.s1_t2_g::smallint, 1, '00000000-0000-0000-0000-000000000001'::uuid
FROM combined c
JOIN pairings_data pd ON c.match_id = pd.match_id
UNION ALL
SELECT c.match_id, pd.id, 2::smallint, c.s2_t1_g::smallint, c.s2_t2_g::smallint, 1, '00000000-0000-0000-0000-000000000001'::uuid
FROM combined c
JOIN pairings_data pd ON c.match_id = pd.match_id
UNION ALL
SELECT c.match_id, pd.id, 3::smallint, c.s3_t1_g::smallint, c.s3_t2_g::smallint, 1, '00000000-0000-0000-0000-000000000001'::uuid
FROM combined c
JOIN pairings_data pd ON c.match_id = pd.match_id;

-- 14) Ensure standings snapshot rows exist for all active players
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
)
INSERT INTO public.standings_snapshots (season_id, player_id)
SELECT s.id, p.id
FROM active_season s
JOIN public.players p ON p.is_active = true
ON CONFLICT (season_id, player_id) DO NOTHING;

-- Summary checks
SELECT 'active season' AS item, count(*) AS total FROM public.seasons WHERE is_active = true
UNION ALL
SELECT 'players', count(*) FROM public.players WHERE is_active = true
UNION ALL
SELECT 'slots', count(*) FROM public.availability_slots
UNION ALL
SELECT 'matches total', count(*) FROM public.matches
UNION ALL
SELECT 'matches completed', count(*) FROM public.matches WHERE status = 'completed'
UNION ALL
SELECT 'pairings', count(*) FROM public.match_pairings
UNION ALL
SELECT 'match sets', count(*) FROM public.match_sets
UNION ALL
SELECT 'standings rows', count(*) FROM public.standings_snapshots;


