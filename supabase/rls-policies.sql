-- ─────────────────────────────────────────────────────────────────────────────
-- PTC2.0 Row-Level Security (RLS) Policies
-- 
-- Roles: admin, captain, player
-- Strategy: Least privilege — admins bypass all, captains score/assign, players see roster + own availability
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON users
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can update user roles
CREATE POLICY "admins_update_users" ON users
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAYERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read all players (public roster)
CREATE POLICY "public_read_players" ON players
  FOR SELECT
  USING (true);

-- Admins can create, update, delete players
CREATE POLICY "admins_manage_players" ON players
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SEASONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read seasons
CREATE POLICY "public_read_seasons" ON seasons
  FOR SELECT
  USING (true);

-- Admins can manage seasons
CREATE POLICY "admins_manage_seasons" ON seasons
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SEASON_PLAYERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read season enrollments
CREATE POLICY "public_read_season_players" ON season_players
  FOR SELECT
  USING (true);

-- Admins can manage enrollments
CREATE POLICY "admins_manage_season_players" ON season_players
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- AVAILABILITY_SLOTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read slots
CREATE POLICY "public_read_availability_slots" ON availability_slots
  FOR SELECT
  USING (true);

-- Admins can manage slots
CREATE POLICY "admins_manage_availability_slots" ON availability_slots
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAYER_AVAILABILITY TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read all availability (so captains can see who's available)
CREATE POLICY "public_read_player_availability" ON player_availability
  FOR SELECT
  USING (true);

-- Players can update their own availability
CREATE POLICY "players_update_own_availability" ON player_availability
  FOR UPDATE
  USING (
    player_id = (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Players can insert their own availability
CREATE POLICY "players_insert_own_availability" ON player_availability
  FOR INSERT
  WITH CHECK (
    player_id = (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all availability
CREATE POLICY "admins_manage_availability" ON player_availability
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCHES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read matches
CREATE POLICY "public_read_matches" ON matches
  FOR SELECT
  USING (true);

-- Admins can manage matches
CREATE POLICY "admins_manage_matches" ON matches
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCH_PAIRINGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read pairings
CREATE POLICY "public_read_match_pairings" ON match_pairings
  FOR SELECT
  USING (true);

-- Admins can manage pairings
CREATE POLICY "admins_manage_match_pairings" ON match_pairings
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCH_SETS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read match results
CREATE POLICY "public_read_match_sets" ON match_sets
  FOR SELECT
  USING (true);

-- Admins and captains can record scores
CREATE POLICY "admins_captains_insert_match_sets" ON match_sets
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'captain')
    )
  );

-- Admins can correct scores
CREATE POLICY "admins_update_match_sets" ON match_sets
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STANDINGS_SNAPSHOTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Everyone can read standings
CREATE POLICY "public_read_standings" ON standings_snapshots
  FOR SELECT
  USING (true);

-- Admins can refresh standings (via API)
CREATE POLICY "admins_manage_standings" ON standings_snapshots
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT_EVENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Admins and captains can read audit log
CREATE POLICY "admins_captains_read_audit" ON audit_events
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'captain')
    )
  );

-- Admins and captains can write audit events (via API)
CREATE POLICY "admins_captains_insert_audit" ON audit_events
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'captain')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Grant usage on schema to authenticated role
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done
-- ─────────────────────────────────────────────────────────────────────────────
