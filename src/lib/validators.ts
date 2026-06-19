import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = loginSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// ─── Players ─────────────────────────────────────────────────────────────────

export const playerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  ntrpRating: z
    .enum(["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"])
    .optional(),
  isActive: z.boolean().default(true),
});

export const updatePlayerSchema = playerSchema.partial();

// ─── Availability ────────────────────────────────────────────────────────────

export const availabilityStatusSchema = z.enum([
  "available",
  "unavailable",
  "maybe",
]);

export const bulkAvailabilitySchema = z.object({
  playerId: z.string().uuid(),
  slots: z.array(
    z.object({
      slotId: z.string().uuid(),
      status: availabilityStatusSchema,
      note: z.string().max(200).optional(),
    })
  ),
});

// ─── Seasons ─────────────────────────────────────────────────────────────────

export const seasonSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

// ─── Match Assignment ────────────────────────────────────────────────────────

export const matchAssignSchema = z.object({
  seasonId: z.string().uuid(),
  slotId: z.string().uuid(),
  weekNumber: z.number().int().positive(),
  court: z.string().optional(),
  pairings: z.array(
    z.object({
      team1Player1Id: z.string().uuid(),
      team1Player2Id: z.string().uuid().optional(),
      team2Player1Id: z.string().uuid(),
      team2Player2Id: z.string().uuid().optional(),
    })
  ),
});

// ─── Score Entry ─────────────────────────────────────────────────────────────

export const setScoreSchema = z
  .object({
    setNumber: z.number().int().min(1).max(5),
    team1Games: z.number().int().min(0).max(7),
    team2Games: z.number().int().min(0).max(7),
    isTiebreak: z.boolean().default(false),
    tiebreakTeam1: z.number().int().min(0).optional(),
    tiebreakTeam2: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      !d.isTiebreak ||
      (d.tiebreakTeam1 !== undefined && d.tiebreakTeam2 !== undefined),
    { message: "Tiebreak scores required when isTiebreak is true" }
  );

export const matchSetsSchema = z.object({
  pairingId: z.string().uuid(),
  sets: z.array(setScoreSchema).min(1).max(5),
});

export const scoreCorrectionSchema = matchSetsSchema.extend({
  correctionReason: z.string().min(1, "Correction reason is required"),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PlayerInput = z.infer<typeof playerSchema>;
export type BulkAvailabilityInput = z.infer<typeof bulkAvailabilitySchema>;
export type SeasonInput = z.infer<typeof seasonSchema>;
export type MatchAssignInput = z.infer<typeof matchAssignSchema>;
export type MatchSetsInput = z.infer<typeof matchSetsSchema>;
export type ScoreCorrectionInput = z.infer<typeof scoreCorrectionSchema>;
