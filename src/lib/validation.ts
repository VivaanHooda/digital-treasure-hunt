import { z } from "zod";
import { ApiError } from "@/lib/api";

const nonEmpty = z.string().trim().min(1).max(120);
const mobile = z.string().trim().min(7).max(20);

const memberSchema = z.object({
  name: nonEmpty,
  mobile,
  department: nonEmpty,
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  teamName: nonEmpty,
  leaderName: nonEmpty,
  leaderMobile: mobile,
  leaderDepartment: nonEmpty,
  // Exactly 3 members (4 total including the leader).
  members: z.array(memberSchema).length(3),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Geolocation submitted for verification.
export const verifySchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().nonnegative().optional(),
});

export const notificationSchema = z.object({
  title: z.string().trim().max(120).optional(),
  message: z.string().trim().min(1).max(1000),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
});

export const pauseSchema = z.object({ paused: z.boolean() }).strict();

export const startGameSchema = z
  .object({
    startTime: z.string().datetime(),
    durationMs: z.number().int().positive().max(86_400_000),
    selectedDatasetId: z.string().min(1),
  })
  .strict();

export const stopGameSchema = z.object({ password: z.string().min(1) }).strict();

export const settingsSchema = z
  .object({
    startTime: z.string().datetime().optional(),
    durationMs: z.number().int().positive().max(86_400_000).optional(),
    selectedDatasetId: z.string().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ---- Datasets & challenges (admin) ----------------------------------------

export const datasetSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

// Image: a local /uploads/... path or an http(s) URL; empty becomes undefined.
const imageUrlField = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z
    .string()
    .trim()
    .max(2000)
    .regex(/^(\/uploads\/|https?:\/\/)/i, "Must be an uploaded path or http(s) URL")
    .optional(),
);

const challengeBase = z.object({
  type: z.enum(["PICTURE", "RIDDLE"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  imageUrl: imageUrlField,
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  marginOfError: z.number().int().positive().max(100_000),
  points: z.number().int().positive().max(100_000),
});

export const challengeCreateSchema = challengeBase.refine(
  (d) => d.type !== "PICTURE" || !!d.imageUrl,
  { message: "Picture challenges require an image", path: ["imageUrl"] },
);

// Partial for edits; the final picture-needs-image invariant is checked in the service.
export const challengeUpdateSchema = challengeBase.partial();

// ---- Dataset export / import ----------------------------------------------

const importedChallenge = z.object({
  position: z.number().optional(),
  type: z.enum(["PICTURE", "RIDDLE"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  // External URL kept as-is; local images travel embedded under `image`.
  imageUrl: z.string().trim().max(2000).optional(),
  image: z.object({ mime: z.string().min(1), data: z.string().min(1) }).optional(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  marginOfError: z.number().int().positive().max(100_000),
  points: z.number().int().positive().max(100_000),
});

export const datasetImportSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  challenges: z.array(importedChallenge).min(1).max(1000),
});
export type DatasetImport = z.infer<typeof datasetImportSchema>;

/** Parse `data` against `schema`, throwing a 400 ApiError on failure. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    throw new ApiError(400, msg, "VALIDATION_ERROR");
  }
  return result.data;
}
