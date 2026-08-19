-- Remove empty scheduled/in-progress duplicates when the same slot already has a completed match.
DELETE FROM public.matches duplicate_match
WHERE duplicate_match.status IN ('scheduled', 'in_progress')
  AND NOT EXISTS (
    SELECT 1 FROM public.match_sets duplicate_sets
    JOIN public.match_pairings duplicate_pairing ON duplicate_pairing.id = duplicate_sets.pairing_id
    WHERE duplicate_pairing.match_id = duplicate_match.id
  )
  AND EXISTS (
    SELECT 1 FROM public.matches completed_match
    WHERE completed_match.slot_id = duplicate_match.slot_id
      AND completed_match.season_id = duplicate_match.season_id
      AND completed_match.status = 'completed'
  );

-- Also collapse slots with multiple empty scheduled rows, keeping the oldest.
DELETE FROM public.matches duplicate_match
WHERE duplicate_match.status IN ('scheduled', 'in_progress')
  AND NOT EXISTS (
    SELECT 1 FROM public.match_sets duplicate_sets
    JOIN public.match_pairings duplicate_pairing ON duplicate_pairing.id = duplicate_sets.pairing_id
    WHERE duplicate_pairing.match_id = duplicate_match.id
  )
  AND EXISTS (
    SELECT 1 FROM public.matches older_empty
    WHERE older_empty.slot_id = duplicate_match.slot_id
      AND older_empty.id <> duplicate_match.id
      AND older_empty.status IN ('scheduled', 'in_progress')
      AND older_empty.created_at < duplicate_match.created_at
      AND NOT EXISTS (
        SELECT 1 FROM public.match_sets older_sets
        JOIN public.match_pairings older_pairing ON older_pairing.id = older_sets.pairing_id
        WHERE older_pairing.match_id = older_empty.id
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS matches_one_per_slot_unique
  ON public.matches (slot_id)
  WHERE slot_id IS NOT NULL;
