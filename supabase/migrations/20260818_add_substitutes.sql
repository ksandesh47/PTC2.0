DO $$ BEGIN
  CREATE TYPE substitute_request_status AS ENUM ('open', 'filled', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE substitute_offer_status AS ENUM ('pending', 'selected', 'not_needed', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.substitute_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.players(id),
  reason text,
  status substitute_request_status NOT NULL DEFAULT 'open',
  filled_by uuid REFERENCES public.players(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.substitute_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.substitute_requests(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id),
  status substitute_offer_status NOT NULL DEFAULT 'pending',
  offered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT substitute_offers_request_player_unique UNIQUE (request_id, player_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS substitute_requests_one_open_match_idx
  ON public.substitute_requests(match_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS substitute_requests_status_idx
  ON public.substitute_requests(status);
CREATE INDEX IF NOT EXISTS substitute_offers_request_status_idx
  ON public.substitute_offers(request_id, status);

ALTER TABLE public.substitute_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitute_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_substitute_requests" ON public.substitute_requests
  FOR SELECT USING (true);
CREATE POLICY "admins_manage_substitute_requests" ON public.substitute_requests
  FOR ALL USING (public.current_user_role() IN ('admin', 'captain'))
  WITH CHECK (public.current_user_role() IN ('admin', 'captain'));
CREATE POLICY "public_read_substitute_offers" ON public.substitute_offers
  FOR SELECT USING (true);
CREATE POLICY "admins_manage_substitute_offers" ON public.substitute_offers
  FOR ALL USING (public.current_user_role() IN ('admin', 'captain'))
  WITH CHECK (public.current_user_role() IN ('admin', 'captain'));