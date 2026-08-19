-- Normalize imported/generated slots to one canonical row per season/date/time.
-- Canonical labels are e.g. "Tue - 5:30 PM", "Sat - 8:30 AM".

CREATE TEMP TABLE slot_canonical_map ON COMMIT DROP AS
WITH parsed AS (
  SELECT
    s.id,
    s.season_id,
    s.slot_date,
    trim(to_char(s.slot_date, 'Dy')) || ' - ' ||
      upper((regexp_match(s.label, '(\d{1,2}:\d{2}\s*(?:AM|PM))', 'i'))[1]) AS canonical_label,
    s.created_at,
    row_number() OVER (
      PARTITION BY s.season_id, s.slot_date,
        upper((regexp_match(s.label, '(\d{1,2}:\d{2}\s*(?:AM|PM))', 'i'))[1])
      ORDER BY (s.label LIKE '% - %') DESC, s.created_at ASC, s.id ASC
    ) AS row_number
  FROM public.availability_slots s
), mapped AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY season_id, slot_date, canonical_label
      ORDER BY row_number
    ) AS canonical_id,
    canonical_label
  FROM parsed
  WHERE canonical_label IS NOT NULL
)
SELECT id, canonical_id, canonical_label
FROM mapped;

UPDATE public.availability_slots s
SET label = m.canonical_label
FROM slot_canonical_map m
WHERE s.id = m.canonical_id;

UPDATE public.matches m
SET slot_id = map.canonical_id,
    updated_at = now()
FROM slot_canonical_map map
WHERE m.slot_id = map.id
  AND map.id <> map.canonical_id;

CREATE TEMP TABLE availability_canonical ON COMMIT DROP AS
SELECT DISTINCT ON (pa.player_id, map.canonical_id)
  pa.player_id,
  map.canonical_id AS slot_id,
  pa.status,
  pa.note,
  pa.updated_at
FROM public.player_availability pa
JOIN slot_canonical_map map ON map.id = pa.slot_id
ORDER BY pa.player_id, map.canonical_id,
  CASE pa.status WHEN 'available' THEN 0 WHEN 'maybe' THEN 1 ELSE 2 END,
  pa.updated_at DESC,
  pa.id DESC;

DELETE FROM public.player_availability pa
USING slot_canonical_map map
WHERE pa.slot_id = map.id
  AND map.id <> map.canonical_id;

INSERT INTO public.player_availability (slot_id, player_id, status, note, updated_at)
SELECT slot_id, player_id, status, note, updated_at
FROM availability_canonical
ON CONFLICT (slot_id, player_id) DO UPDATE SET
  status = EXCLUDED.status,
  note = EXCLUDED.note,
  updated_at = EXCLUDED.updated_at;

DELETE FROM public.availability_slots s
USING slot_canonical_map map
WHERE s.id = map.id
  AND map.id <> map.canonical_id;

CREATE UNIQUE INDEX IF NOT EXISTS availability_slots_season_date_label_unique
  ON public.availability_slots (season_id, slot_date, label);
