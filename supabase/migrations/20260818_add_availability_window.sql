ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS availability_window_start date,
  ADD COLUMN IF NOT EXISTS availability_window_end date;

UPDATE public.seasons
SET
  availability_window_start = COALESCE(availability_window_start, start_date),
  availability_window_end = COALESCE(availability_window_end, end_date)
WHERE availability_window_start IS NULL
   OR availability_window_end IS NULL;

ALTER TABLE public.seasons
  DROP CONSTRAINT IF EXISTS seasons_availability_window_order,
  DROP CONSTRAINT IF EXISTS seasons_availability_window_bounds;

ALTER TABLE public.seasons
  ADD CONSTRAINT seasons_availability_window_order
  CHECK (availability_window_start IS NULL
    OR availability_window_end IS NULL
    OR availability_window_start <= availability_window_end),
  ADD CONSTRAINT seasons_availability_window_bounds
  CHECK (availability_window_start IS NULL
    OR availability_window_end IS NULL
    OR (availability_window_start >= start_date AND availability_window_end <= end_date));