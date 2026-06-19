import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  timestamp,
  date,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "captain", "player"]);
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "in_progress",
  "completed",
  "abandoned",
  "cancelled",
]);
export const availabilityEnum = pgEnum("availability_status", [
  "available",
  "unavailable",
  "maybe",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "score_entry",
  "score_correction",
  "season_activate",
  "match_assign",
  "match_abandon",
]);

// ─── users ────────────────────────────────────────────────────────────────────
// Mirrors Supabase auth.users — only extend, never duplicate auth columns.

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default("player"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── players ─────────────────────────────────────────────────────────────────

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  ntrpRating: text("ntrp_rating"), // e.g. "3.5", "4.0"
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── seasons ──────────────────────────────────────────────────────────────────

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // e.g. "Summer 2026"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── season_players ───────────────────────────────────────────────────────────

export const seasonPlayers = pgTable(
  "season_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    isCaptain: boolean("is_captain").notNull().default(false),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.seasonId, t.playerId)]
);

// ─── availability_slots ───────────────────────────────────────────────────────
// Admin-defined windows players declare into (e.g. "Week 3 – Saturday AM").

export const availabilitySlots = pgTable("availability_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // "Week 3 – Sat AM"
  slotDate: date("slot_date").notNull(),
  weekNumber: smallint("week_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── player_availability ──────────────────────────────────────────────────────

export const playerAvailability = pgTable(
  "player_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => availabilitySlots.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: availabilityEnum("status").notNull().default("available"),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.slotId, t.playerId)]
);

// ─── matches ──────────────────────────────────────────────────────────────────

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "restrict" }),
    slotId: uuid("slot_id").references(() => availabilitySlots.id, {
      onDelete: "set null",
    }),
    weekNumber: smallint("week_number").notNull(),
    court: text("court"),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    abandonReason: text("abandon_reason"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("matches_season_week_idx").on(t.seasonId, t.weekNumber)]
);

// ─── match_pairings ───────────────────────────────────────────────────────────
// Doubles match: team1 = (player1Id, player2Id), team2 = (player3Id, player4Id).
// Singles: only player1Id and player3Id are set.

export const matchPairings = pgTable("match_pairings", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  team1Player1Id: uuid("team1_player1_id")
    .notNull()
    .references(() => players.id),
  team1Player2Id: uuid("team1_player2_id").references(() => players.id),
  team2Player1Id: uuid("team2_player1_id")
    .notNull()
    .references(() => players.id),
  team2Player2Id: uuid("team2_player2_id").references(() => players.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── match_sets ───────────────────────────────────────────────────────────────
// Append-only. Corrections add a new row with correctedBy; old rows stay.

export const matchSets = pgTable(
  "match_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "restrict" }),
    pairingId: uuid("pairing_id")
      .notNull()
      .references(() => matchPairings.id),
    setNumber: smallint("set_number").notNull(),
    team1Games: smallint("team1_games").notNull(),
    team2Games: smallint("team2_games").notNull(),
    isTiebreak: boolean("is_tiebreak").notNull().default(false),
    tiebreakTeam1: smallint("tiebreak_team1"),
    tiebreakTeam2: smallint("tiebreak_team2"),
    version: smallint("version").notNull().default(1),
    correctedBy: uuid("corrected_by").references(() => users.id),
    correctionReason: text("correction_reason"),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => users.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("match_sets_match_pairing_idx").on(t.matchId, t.pairingId)]
);

// ─── standings_snapshots ──────────────────────────────────────────────────────
// Cached standings recomputed after each score write.

export const standingsSnapshots = pgTable(
  "standings_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    matchesPlayed: integer("matches_played").notNull().default(0),
    matchesWon: integer("matches_won").notNull().default(0),
    setsWon: integer("sets_won").notNull().default(0),
    setsLost: integer("sets_lost").notNull().default(0),
    gamesWon: integer("games_won").notNull().default(0),
    gamesLost: integer("games_lost").notNull().default(0),
    points: integer("points").notNull().default(0),
    rank: smallint("rank"),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique().on(t.seasonId, t.playerId),
    index("standings_season_idx").on(t.seasonId),
  ]
);

// ─── audit_events ─────────────────────────────────────────────────────────────

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: auditActionEnum("action").notNull(),
    resourceType: text("resource_type").notNull(), // "match", "player", "season", …
    resourceId: uuid("resource_id"),
    diff: jsonb("diff"), // { before: {…}, after: {…} }
    metadata: jsonb("metadata"), // extra context
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_actor_idx").on(t.actorId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  player: many(players),
  recordedSets: many(matchSets, { relationName: "recordedBy" }),
  correctedSets: many(matchSets, { relationName: "correctedBy" }),
  auditEvents: many(auditEvents),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  user: one(users, { fields: [players.userId], references: [users.id] }),
  seasonPlayers: many(seasonPlayers),
  availability: many(playerAvailability),
  standings: many(standingsSnapshots),
}));

export const seasonsRelations = relations(seasons, ({ many }) => ({
  seasonPlayers: many(seasonPlayers),
  slots: many(availabilitySlots),
  matches: many(matches),
  standings: many(standingsSnapshots),
}));

export const seasonPlayersRelations = relations(seasonPlayers, ({ one }) => ({
  season: one(seasons, {
    fields: [seasonPlayers.seasonId],
    references: [seasons.id],
  }),
  player: one(players, {
    fields: [seasonPlayers.playerId],
    references: [players.id],
  }),
}));

export const availabilitySlotsRelations = relations(
  availabilitySlots,
  ({ one, many }) => ({
    season: one(seasons, {
      fields: [availabilitySlots.seasonId],
      references: [seasons.id],
    }),
    playerAvailability: many(playerAvailability),
    matches: many(matches),
  })
);

export const playerAvailabilityRelations = relations(
  playerAvailability,
  ({ one }) => ({
    slot: one(availabilitySlots, {
      fields: [playerAvailability.slotId],
      references: [availabilitySlots.id],
    }),
    player: one(players, {
      fields: [playerAvailability.playerId],
      references: [players.id],
    }),
  })
);

export const matchesRelations = relations(matches, ({ one, many }) => ({
  season: one(seasons, {
    fields: [matches.seasonId],
    references: [seasons.id],
  }),
  slot: one(availabilitySlots, {
    fields: [matches.slotId],
    references: [availabilitySlots.id],
  }),
  pairings: many(matchPairings),
}));

export const matchPairingsRelations = relations(
  matchPairings,
  ({ one, many }) => ({
    match: one(matches, {
      fields: [matchPairings.matchId],
      references: [matches.id],
    }),
    sets: many(matchSets),
  })
);

export const matchSetsRelations = relations(matchSets, ({ one }) => ({
  match: one(matches, {
    fields: [matchSets.matchId],
    references: [matches.id],
  }),
  pairing: one(matchPairings, {
    fields: [matchSets.pairingId],
    references: [matchPairings.id],
  }),
  recorder: one(users, {
    fields: [matchSets.recordedBy],
    references: [users.id],
    relationName: "recordedBy",
  }),
  corrector: one(users, {
    fields: [matchSets.correctedBy],
    references: [users.id],
    relationName: "correctedBy",
  }),
}));

export const standingsSnapshotsRelations = relations(
  standingsSnapshots,
  ({ one }) => ({
    season: one(seasons, {
      fields: [standingsSnapshots.seasonId],
      references: [seasons.id],
    }),
    player: one(players, {
      fields: [standingsSnapshots.playerId],
      references: [players.id],
    }),
  })
);

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  actor: one(users, {
    fields: [auditEvents.actorId],
    references: [users.id],
  }),
}));
