-- Harden client access. Server-rendered routes use the database connection directly.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM public.users WHERE id = auth.uid(); $$;
ALTER FUNCTION public.current_user_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'players', 'seasons', 'season_players', 'availability_slots',
    'player_availability', 'matches', 'match_pairings', 'match_sets',
    'standings_snapshots', 'audit_events'
  ] LOOP
    FOR policy_name IN
      SELECT polname FROM pg_policy
      WHERE polrelid = format('public.%I', table_name)::regclass
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "admins_read_all_users" ON public.users;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.users;
DROP POLICY IF EXISTS "admins_update_users" ON public.users;
DROP POLICY IF EXISTS "admins_manage_users" ON public.users;
DROP POLICY IF EXISTS "public_read_seasons" ON public.seasons;
DROP POLICY IF EXISTS "admins_manage_seasons" ON public.seasons;
DROP POLICY IF EXISTS "public_read_season_players" ON public.season_players;
DROP POLICY IF EXISTS "admins_manage_season_players" ON public.season_players;
DROP POLICY IF EXISTS "public_read_availability_slots" ON public.availability_slots;
DROP POLICY IF EXISTS "admins_manage_availability_slots" ON public.availability_slots;
DROP POLICY IF EXISTS "public_read_matches" ON public.matches;
DROP POLICY IF EXISTS "admins_manage_matches" ON public.matches;
DROP POLICY IF EXISTS "public_read_match_pairings" ON public.match_pairings;
DROP POLICY IF EXISTS "admins_manage_match_pairings" ON public.match_pairings;
DROP POLICY IF EXISTS "public_read_standings" ON public.standings_snapshots;
DROP POLICY IF EXISTS "admins_manage_standings" ON public.standings_snapshots;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standings_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_players" ON public.players;
DROP POLICY IF EXISTS "admins_manage_players" ON public.players;
CREATE POLICY "players_read_own_profile" ON public.players FOR SELECT
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin', 'captain'));
CREATE POLICY "admins_manage_players" ON public.players FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "users_read_own_profile" ON public.users FOR SELECT
  USING (auth.uid() = id OR public.current_user_role() = 'admin');
CREATE POLICY "admins_manage_users" ON public.users FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "public_read_seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "admins_manage_seasons" ON public.seasons FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "public_read_season_players" ON public.season_players FOR SELECT USING (true);
CREATE POLICY "admins_manage_season_players" ON public.season_players FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "public_read_availability_slots" ON public.availability_slots FOR SELECT USING (true);
CREATE POLICY "admins_manage_availability_slots" ON public.availability_slots FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');
CREATE POLICY "public_read_matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "admins_manage_matches" ON public.matches FOR ALL
  USING (public.current_user_role() IN ('admin', 'captain'))
  WITH CHECK (public.current_user_role() IN ('admin', 'captain'));
CREATE POLICY "public_read_match_pairings" ON public.match_pairings FOR SELECT USING (true);
CREATE POLICY "admins_manage_match_pairings" ON public.match_pairings FOR ALL
  USING (public.current_user_role() IN ('admin', 'captain'))
  WITH CHECK (public.current_user_role() IN ('admin', 'captain'));
CREATE POLICY "public_read_standings" ON public.standings_snapshots FOR SELECT USING (true);
CREATE POLICY "admins_manage_standings" ON public.standings_snapshots FOR ALL
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "public_read_player_availability" ON public.player_availability;
DROP POLICY IF EXISTS "players_update_own_availability" ON public.player_availability;
DROP POLICY IF EXISTS "players_insert_own_availability" ON public.player_availability;
DROP POLICY IF EXISTS "admins_manage_availability" ON public.player_availability;
CREATE POLICY "players_read_allowed_availability" ON public.player_availability FOR SELECT
  USING (player_id = (SELECT id FROM public.players WHERE user_id = auth.uid())
    OR public.current_user_role() IN ('admin', 'captain'));
CREATE POLICY "players_insert_own_availability" ON public.player_availability FOR INSERT
  WITH CHECK (player_id = (SELECT id FROM public.players WHERE user_id = auth.uid())
    OR public.current_user_role() = 'admin');
CREATE POLICY "players_update_own_availability" ON public.player_availability FOR UPDATE
  USING (player_id = (SELECT id FROM public.players WHERE user_id = auth.uid())
    OR public.current_user_role() = 'admin')
  WITH CHECK (player_id = (SELECT id FROM public.players WHERE user_id = auth.uid())
    OR public.current_user_role() = 'admin');
CREATE POLICY "players_delete_own_availability" ON public.player_availability FOR DELETE
  USING (player_id = (SELECT id FROM public.players WHERE user_id = auth.uid())
    OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "public_read_match_sets" ON public.match_sets;
DROP POLICY IF EXISTS "admins_captains_insert_match_sets" ON public.match_sets;
DROP POLICY IF EXISTS "admins_update_match_sets" ON public.match_sets;
CREATE POLICY "public_read_match_sets" ON public.match_sets FOR SELECT USING (true);
CREATE POLICY "admins_captains_insert_match_sets" ON public.match_sets FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'captain'));

DROP POLICY IF EXISTS "admins_captains_read_audit" ON public.audit_events;
DROP POLICY IF EXISTS "admins_captains_insert_audit" ON public.audit_events;
CREATE POLICY "admins_captains_read_audit" ON public.audit_events FOR SELECT
  USING (public.current_user_role() IN ('admin', 'captain'));
CREATE POLICY "admins_captains_insert_audit" ON public.audit_events FOR INSERT
  WITH CHECK (public.current_user_role() IN ('admin', 'captain'));

REVOKE ALL ON public.users, public.players, public.player_availability, public.audit_events FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
