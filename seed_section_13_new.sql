-- Section 13: Import 52 completed matches from production (May 4 - Jul 25, 2026)
-- This replaces the old 3-match section with comprehensive match data

-- First, provide all match data with player names and scores
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

-- Resolve player names to UUIDs
resolved_matches AS (
  SELECT
    m.match_num,
    m.match_date,
    m.match_time,
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

-- Insert match records
matches_inserted AS (
  INSERT INTO public.matches (season_id, slot_id, week_number, court, status)
  SELECT
    (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1),
    NULL,  -- No specific slot assigned to completed matches
    EXTRACT(WEEK FROM match_date)::smallint - 17 + 1 AS week_number,  -- Adjusted for May 1 start
    'Court A',
    'completed'::public.match_status
  FROM resolved_matches
  ORDER BY match_num DESC  -- Insert in reverse order
  RETURNING id, (ROW_NUMBER() OVER (ORDER BY id DESC))::int AS match_order
),

-- Match positions for reference
match_positions AS (
  SELECT id, match_order FROM matches_inserted
),

-- Combine matches with their resolved player data
match_with_players AS (
  SELECT
    rm.match_num,
    mp.id AS match_id,
    rm.p1_id, rm.p2_id, rm.p3_id, rm.p4_id,
    rm.s1_t1_g, rm.s1_t2_g,
    rm.s2_t1_g, rm.s2_t2_g,
    rm.s3_t1_g, rm.s3_t2_g
  FROM resolved_matches rm
  JOIN match_positions mp ON rm.match_num = mp.match_order
),

-- Insert match pairings (3 sets per match = 3 pairings per match)
pairings_inserted AS (
  INSERT INTO public.match_pairings (
    match_id,
    team1_player1_id,
    team1_player2_id,
    team2_player1_id,
    team2_player2_id
  )
  SELECT
    mwp.match_id,
    mwp.p1_id,
    mwp.p2_id,
    mwp.p3_id,
    mwp.p4_id
  FROM match_with_players mwp
  RETURNING id, match_id
),

-- Insert match sets using the pairings
set_inserts AS (
  INSERT INTO public.match_sets (
    match_id,
    pairing_id,
    set_number,
    team1_games,
    team2_games,
    version,
    recorded_by
  )
  SELECT
    mwp.match_id,
    pi.id,
    1::smallint,
    mwp.s1_t1_g::smallint,
    mwp.s1_t2_g::smallint,
    1,
    '00000000-0000-0000-0000-000000000001'::uuid
  FROM match_with_players mwp
  JOIN pairings_inserted pi ON mwp.match_id = pi.match_id
  UNION ALL
  SELECT
    mwp.match_id,
    pi.id,
    2::smallint,
    mwp.s2_t1_g::smallint,
    mwp.s2_t2_g::smallint,
    1,
    '00000000-0000-0000-0000-000000000001'::uuid
  FROM match_with_players mwp
  JOIN pairings_inserted pi ON mwp.match_id = pi.match_id
  UNION ALL
  SELECT
    mwp.match_id,
    pi.id,
    3::smallint,
    mwp.s3_t1_g::smallint,
    mwp.s3_t2_g::smallint,
    1,
    '00000000-0000-0000-0000-000000000001'::uuid
  FROM match_with_players mwp
  JOIN pairings_inserted pi ON mwp.match_id = pi.match_id
)

SELECT
  'Completed match import' AS status,
  COUNT(*) as inserted_set_records
FROM set_inserts;

-- Ensure standings snapshot rows exist for all active players
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
)
INSERT INTO public.standings_snapshots (season_id, player_id)
SELECT s.id, p.id
FROM active_season s
JOIN public.players p ON p.is_active = true
ON CONFLICT (season_id, player_id) DO NOTHING;

-- Summary checks
SELECT 'IMPORT SUMMARY' AS section
UNION ALL
SELECT '=============' AS section
UNION ALL
SELECT 'Active season' AS item
UNION ALL
SELECT 'Matches (completed)' AS item
UNION ALL
SELECT 'Match pairings' AS item
UNION ALL
SELECT 'Match sets' AS item
UNION ALL
SELECT 'Standings rows' AS item;
