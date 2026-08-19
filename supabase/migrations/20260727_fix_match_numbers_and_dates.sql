-- Fix match_number and slot_id for the 52 completed matches
-- Issues:
--   1. match_number was backfilled by created_at order, but matches were inserted
--      in reverse (52 first, 1 last), causing match_number to be inverted.
--   2. Weekend slot_id used LIMIT 1 without matching time, so 11:00 AM matches
--      may point to the 8:30 AM slot.
--   3. Step 11 created 3 duplicate completed matches (Jun 13, 14, 15) that are
--      also in step 13's 52-match import.

-- Step 1: Remove duplicate completed matches from step 11 (no pairings)
DELETE FROM public.matches
WHERE status = 'completed'
  AND id NOT IN (
    SELECT match_id FROM public.match_pairings
  );

-- Step 2: Drop the unique constraint temporarily so we can reassign match_numbers
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_season_match_number_unique;

-- Step 3: Fix slot_id using player pairings and source match date/time
-- Match numbers are reassigned in Step 4 to guarantee uniqueness.
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
source_data(match_num, match_date, match_time, p1, p2, p3, p4) AS (
  VALUES
    (52, DATE '2026-07-25', TIME '11:00:00', 'Todd', 'Ahad', 'Henry', 'Kevin'),
    (51, DATE '2026-07-24', TIME '17:30:00', 'Brownie', 'Cruz', 'Sandesh', 'Todd'),
    (50, DATE '2026-07-23', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'RI Jeff'),
    (49, DATE '2026-07-22', TIME '17:30:00', 'Mike L', 'Vijay', 'Eric', 'Raj'),
    (48, DATE '2026-07-20', TIME '17:30:00', 'Connors', 'Cruz', 'Raj', 'Jon'),
    (47, DATE '2026-07-18', TIME '08:30:00', 'Henry', 'Kevin', 'Cruz', 'Raj'),
    (46, DATE '2026-07-17', TIME '17:30:00', 'Henry', 'Raj', 'Sandesh', 'Kevin'),
    (45, DATE '2026-07-16', TIME '17:30:00', 'Brian', 'Denny', 'Vijay', 'Jeremy'),
    (44, DATE '2026-07-15', TIME '17:30:00', 'Brownie', 'Doug', 'Marc', 'Raj'),
    (43, DATE '2026-07-14', TIME '17:30:00', 'Ahad', 'Brian', 'Vijay', 'Jeremy'),
    (42, DATE '2026-07-13', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob'),
    (41, DATE '2026-07-11', TIME '08:30:00', 'Henry', 'Raj', 'Brownie', 'Kevin'),
    (40, DATE '2026-07-10', TIME '17:30:00', 'Raj', 'Sandesh', 'Todd', 'Vijay'),
    (39, DATE '2026-07-09', TIME '17:30:00', 'Denny', 'Greg', 'Jeremy', 'Marc'),
    (38, DATE '2026-07-08', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Vijay'),
    (37, DATE '2026-07-06', TIME '17:30:00', 'Connors', 'Henry', 'Jon', 'Mike L'),
    (36, DATE '2026-07-03', TIME '17:30:00', 'Doug', 'Greg', 'Sandesh', 'Todd'),
    (35, DATE '2026-07-01', TIME '17:30:00', 'Brian', 'Greg', 'Marc', 'Raj'),
    (34, DATE '2026-06-30', TIME '17:30:00', 'Brian', 'Eric', 'Ahad', 'Raj'),
    (33, DATE '2026-06-29', TIME '17:30:00', 'Connors', 'Greg', 'Kevin', 'Raj'),
    (32, DATE '2026-06-28', TIME '08:30:00', 'Cruz', 'Doug', 'Raj', 'Mike L'),
    (31, DATE '2026-06-27', TIME '11:00:00', 'Eric', 'Jeremy', 'Ravi', 'Rob'),
    (30, DATE '2026-06-25', TIME '17:30:00', 'Brownie', 'Denny', 'Kevin', 'RI Jeff'),
    (29, DATE '2026-06-24', TIME '17:30:00', 'Marc', 'Ravi', 'Vijay', 'Mike L'),
    (28, DATE '2026-06-23', TIME '17:30:00', 'Todd', 'Ahad', 'Cruz', 'Jeremy'),
    (27, DATE '2026-06-20', TIME '11:00:00', 'Eric', 'Rob', 'Vijay', 'Mike L'),
    (26, DATE '2026-06-19', TIME '17:30:00', 'Brownie', 'Greg', 'Henry', 'Denny'),
    (25, DATE '2026-06-17', TIME '17:30:00', 'Brian', 'Marc', 'Raj', 'Mike L'),
    (24, DATE '2026-06-16', TIME '17:30:00', 'Ahad', 'Brownie', 'Cruz', 'Kevin'),
    (23, DATE '2026-06-15', TIME '17:30:00', 'Connors', 'Marc', 'Mike L', 'Rob'),
    (22, DATE '2026-06-14', TIME '08:30:00', 'Brownie', 'Doug', 'Todd', 'Vijay'),
    (21, DATE '2026-06-13', TIME '08:30:00', 'Henry', 'Jeremy', 'Todd', 'Vijay'),
    (20, DATE '2026-06-12', TIME '17:30:00', 'Vijay', 'Sandesh', 'Denny', 'Raj'),
    (19, DATE '2026-06-11', TIME '17:30:00', 'Brian', 'Doug', 'Jeremy', 'Kevin'),
    (18, DATE '2026-06-09', TIME '17:30:00', 'Brian', 'Jeremy', 'Ahad', 'Brownie'),
    (17, DATE '2026-06-08', TIME '17:30:00', 'Doug', 'Kevin', 'Eric', 'Connors'),
    (16, DATE '2026-06-05', TIME '17:30:00', 'Ahad', 'Eric', 'Greg', 'Sandesh'),
    (15, DATE '2026-05-27', TIME '17:30:00', 'Brian', 'Eric', 'Rob', 'Todd'),
    (14, DATE '2026-05-26', TIME '17:30:00', 'Ahad', 'Brian', 'Cruz', 'Jeremy'),
    (13, DATE '2026-05-25', TIME '17:30:00', 'Cruz', 'Eric', 'Jon', 'Rob'),
    (12, DATE '2026-05-23', TIME '08:30:00', 'Brownie', 'Henry', 'Jeremy', 'Sandesh'),
    (11, DATE '2026-05-22', TIME '17:30:00', 'Eric', 'Greg', 'Kevin', 'Sandesh'),
    (10, DATE '2026-05-21', TIME '17:30:00', 'Brownie', 'Denny', 'Henry', 'Jeremy'),
    (9, DATE '2026-05-20', TIME '17:30:00', 'Brian', 'Eric', 'Greg', 'Kevin'),
    (8, DATE '2026-05-18', TIME '17:30:00', 'Connors', 'Doug', 'Jon', 'Sandesh'),
    (7, DATE '2026-05-17', TIME '08:30:00', 'Brownie', 'Cruz', 'Doug', 'Rob'),
    (6, DATE '2026-05-16', TIME '08:30:00', 'Doug', 'Eric', 'Henry', 'Mike L'),
    (5, DATE '2026-05-15', TIME '17:30:00', 'Greg', 'Kevin', 'Todd', 'Sandesh'),
    (4, DATE '2026-05-12', TIME '17:30:00', 'Ahad', 'Brian', 'Eric', 'Todd'),
    (3, DATE '2026-05-08', TIME '17:30:00', 'Eric', 'RI Jeff', 'Sandesh', 'Todd'),
    (2, DATE '2026-05-05', TIME '17:30:00', 'Brownie', 'Denny', 'Doug', 'RI Jeff'),
    (1, DATE '2026-05-04', TIME '17:30:00', 'Connors', 'Cruz', 'Eric', 'Denny')
),
-- Resolve source players to IDs
resolved_source AS (
  SELECT
    sd.match_num,
    sd.match_date,
    sd.match_time,
    p1.id AS p1_id,
    p2.id AS p2_id,
    p3.id AS p3_id,
    p4.id AS p4_id
  FROM source_data sd
  JOIN public.players p1 ON p1.first_name = sd.p1
  JOIN public.players p2 ON p2.first_name = sd.p2
  JOIN public.players p3 ON p3.first_name = sd.p3
  JOIN public.players p4 ON p4.first_name = sd.p4
),
-- Find correct slot_id for each match (matching date AND time)
correct_slots AS (
  SELECT
    rs.match_num,
    rs.match_date,
    rs.match_time,
    rs.p1_id, rs.p2_id, rs.p3_id, rs.p4_id,
    sl.id AS correct_slot_id
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
-- Match each DB match to source by its pairings
match_mapping AS (
  SELECT
    m.id AS match_id,
    cs.correct_slot_id
  FROM public.matches m
  JOIN public.match_pairings mp ON mp.match_id = m.id
  JOIN correct_slots cs
    ON mp.team1_player1_id = cs.p1_id
   AND mp.team1_player2_id = cs.p2_id
   AND mp.team2_player1_id = cs.p3_id
   AND mp.team2_player2_id = cs.p4_id
  WHERE m.status = 'completed'
    AND m.season_id = (SELECT id FROM active_season)
)
UPDATE public.matches m
SET
  slot_id = mm.correct_slot_id
FROM match_mapping mm
WHERE m.id = mm.match_id;

-- Step 4: Reassign completed match_number chronologically (oldest=1, newest=52)
-- This guarantees uniqueness even if some player quartets repeat across matches.
WITH active_season AS (
  SELECT id FROM public.seasons WHERE is_active = true LIMIT 1
),
completed_ranked AS (
  SELECT
    m.id,
    ROW_NUMBER() OVER (
      ORDER BY
        sl.slot_date ASC,
        CASE
          WHEN sl.label LIKE '%8:30 AM' THEN TIME '08:30:00'
          WHEN sl.label LIKE '%11:00 AM' THEN TIME '11:00:00'
          WHEN sl.label LIKE '%5:30 PM' THEN TIME '17:30:00'
          ELSE TIME '00:00:00'
        END ASC,
        m.id ASC
    ) AS new_match_number
  FROM public.matches m
  LEFT JOIN public.availability_slots sl ON sl.id = m.slot_id
  WHERE m.season_id = (SELECT id FROM active_season)
    AND m.status = 'completed'
)
UPDATE public.matches m
SET match_number = cr.new_match_number
FROM completed_ranked cr
WHERE m.id = cr.id;

-- Step 5: Non-completed matches should not hold numbered history slots
UPDATE public.matches m
SET match_number = NULL
WHERE m.season_id = (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1)
  AND m.status <> 'completed';

-- Step 6: Re-add the unique constraint
ALTER TABLE public.matches
  ADD CONSTRAINT matches_season_match_number_unique
  UNIQUE (season_id, match_number);

-- Verification: check that matches are now ordered correctly
-- Recent matches (high match_number) should have recent dates
SELECT
  m.match_number,
  sl.slot_date,
  sl.label,
  m.status
FROM public.matches m
LEFT JOIN public.availability_slots sl ON sl.id = m.slot_id
WHERE m.season_id = (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1)
  AND m.status = 'completed'
ORDER BY m.match_number DESC
LIMIT 10;
