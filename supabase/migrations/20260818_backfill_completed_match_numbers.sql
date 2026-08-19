-- Ensure every completed match has a stable display number.
WITH missing AS (
  SELECT
    m.id,
    m.season_id,
    COALESCE((
      SELECT MAX(existing.match_number)
      FROM public.matches existing
      WHERE existing.season_id = m.season_id
    ), 0) + ROW_NUMBER() OVER (
      PARTITION BY m.season_id
      ORDER BY sl.slot_date ASC, sl.label ASC, m.created_at ASC, m.id ASC
    ) AS next_number
  FROM public.matches m
  LEFT JOIN public.availability_slots sl ON sl.id = m.slot_id
  WHERE m.status = 'completed'
    AND m.match_number IS NULL
)
UPDATE public.matches m
SET match_number = missing.next_number,
    updated_at = now()
FROM missing
WHERE m.id = missing.id;
