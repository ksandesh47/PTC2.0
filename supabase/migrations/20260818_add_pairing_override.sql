ALTER TABLE public.match_sets
  ADD COLUMN IF NOT EXISTS pairing_override smallint;

ALTER TABLE public.match_sets
  DROP CONSTRAINT IF EXISTS match_sets_pairing_override_range;

ALTER TABLE public.match_sets
  ADD CONSTRAINT match_sets_pairing_override_range
  CHECK (pairing_override IS NULL OR pairing_override BETWEEN 0 AND 2);