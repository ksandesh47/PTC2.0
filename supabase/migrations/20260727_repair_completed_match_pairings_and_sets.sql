-- Repair completed match pairings and set scores by exact match_number mapping.
-- Use this after match_number/date fixes when lineups/scores are shifted.

WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
source_data(match_num, match_date, match_time, p1, p2, p3, p4, s1_t1_g, s1_t2_g, s2_t1_g, s2_t2_g, s3_t1_g, s3_t2_g) AS (
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
resolved_source AS (
  SELECT
    sd.match_num,
    sd.match_date,
    sd.match_time,
    p1.id AS p1_id,
    p2.id AS p2_id,
    p3.id AS p3_id,
    p4.id AS p4_id,
    sd.s1_t1_g, sd.s1_t2_g,
    sd.s2_t1_g, sd.s2_t2_g,
    sd.s3_t1_g, sd.s3_t2_g
  FROM source_data sd
  JOIN public.players p1 ON p1.first_name = sd.p1
  JOIN public.players p2 ON p2.first_name = sd.p2
  JOIN public.players p3 ON p3.first_name = sd.p3
  JOIN public.players p4 ON p4.first_name = sd.p4
),
correct_slots AS (
  SELECT
    rs.match_num,
    sl.id AS slot_id
  FROM resolved_source rs
  JOIN active_season s ON true
  JOIN public.availability_slots sl
    ON sl.season_id = s.id
   AND sl.slot_date = rs.match_date
   AND sl.label LIKE '%' || CASE
     WHEN rs.match_time = TIME '17:30:00' THEN '5:30 PM'
     WHEN rs.match_time = TIME '08:30:00' THEN '8:30 AM'
     WHEN rs.match_time = TIME '11:00:00' THEN '11:00 AM'
   END
),
matched AS (
  SELECT
    m.id AS match_id,
    rs.match_num,
    rs.p1_id, rs.p2_id, rs.p3_id, rs.p4_id,
    rs.s1_t1_g, rs.s1_t2_g,
    rs.s2_t1_g, rs.s2_t2_g,
    rs.s3_t1_g, rs.s3_t2_g,
    cs.slot_id
  FROM resolved_source rs
  JOIN active_season s ON true
  JOIN public.matches m
    ON m.season_id = s.id
   AND m.status = 'completed'
   AND m.match_number = rs.match_num
  LEFT JOIN correct_slots cs ON cs.match_num = rs.match_num
),
cleanup_sets AS (
  DELETE FROM public.match_sets ms
  USING public.match_pairings mp, public.matches m, active_season s
  WHERE ms.pairing_id = mp.id
    AND mp.match_id = m.id
    AND m.season_id = s.id
    AND m.status = 'completed'
  RETURNING ms.id
),
cleanup_pairings AS (
  DELETE FROM public.match_pairings mp
  USING public.matches m, active_season s
  WHERE mp.match_id = m.id
    AND m.season_id = s.id
    AND m.status = 'completed'
  RETURNING mp.id
),
update_slots AS (
  UPDATE public.matches m
  SET slot_id = mt.slot_id
  FROM matched mt
  WHERE m.id = mt.match_id
    AND mt.slot_id IS NOT NULL
  RETURNING m.id
),
inserted_pairings AS (
  INSERT INTO public.match_pairings (
    match_id,
    team1_player1_id,
    team1_player2_id,
    team2_player1_id,
    team2_player2_id
  )
  SELECT
    mt.match_id,
    mt.p1_id,
    mt.p2_id,
    mt.p3_id,
    mt.p4_id
  FROM matched mt
  RETURNING id, match_id
)
INSERT INTO public.match_sets (match_id, pairing_id, set_number, team1_games, team2_games, version, recorded_by)
SELECT mt.match_id, ip.id, 1::smallint, mt.s1_t1_g::smallint, mt.s1_t2_g::smallint, 1, '00000000-0000-0000-0000-000000000001'::uuid
FROM matched mt
JOIN inserted_pairings ip ON ip.match_id = mt.match_id
UNION ALL
SELECT mt.match_id, ip.id, 2::smallint, mt.s2_t1_g::smallint, mt.s2_t2_g::smallint, 1, '00000000-0000-0000-0000-000000000001'::uuid
FROM matched mt
JOIN inserted_pairings ip ON ip.match_id = mt.match_id
UNION ALL
SELECT mt.match_id, ip.id, 3::smallint, mt.s3_t1_g::smallint, mt.s3_t2_g::smallint, 1, '00000000-0000-0000-0000-000000000001'::uuid
FROM matched mt
JOIN inserted_pairings ip ON ip.match_id = mt.match_id;

-- Verification snapshot: top recent completed matches
SELECT
  m.match_number,
  sl.slot_date,
  sl.label,
  p1.first_name AS p1,
  p2.first_name AS p2,
  p3.first_name AS p3,
  p4.first_name AS p4
FROM public.matches m
JOIN public.match_pairings mp ON mp.match_id = m.id
LEFT JOIN public.availability_slots sl ON sl.id = m.slot_id
LEFT JOIN public.players p1 ON p1.id = mp.team1_player1_id
LEFT JOIN public.players p2 ON p2.id = mp.team1_player2_id
LEFT JOIN public.players p3 ON p3.id = mp.team2_player1_id
LEFT JOIN public.players p4 ON p4.id = mp.team2_player2_id
WHERE m.season_id = (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1)
  AND m.status = 'completed'
ORDER BY m.match_number DESC
LIMIT 10;
