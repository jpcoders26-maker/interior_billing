import { z } from "zod";

// Client-generated ids look like "C1" (seed data) or "C" + Date.now() (new
// records) — see src/lib/format.js `uid()`. Just bound the length/charset.
export const idSchema = z.string().trim().min(1).max(64);

// Dates travel as "YYYY-MM-DD" strings from <input type="date">.
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date")
  .transform((s) => new Date(`${s}T00:00:00.000Z`));

// Subscription timestamps travel as epoch milliseconds (Date.now()-based).
export const epochMsSchema = z.coerce.number().int().min(0).transform((ms) => new Date(ms));

export const moneySchema = z.coerce.number().finite().min(0).max(999_999_999);
export const signedMoneySchema = z.coerce.number().finite().min(-999_999_999).max(999_999_999);
export const percentSchema = z.coerce.number().finite().min(0).max(100);

export const shortText = (max = 200) => z.string().trim().max(max);
export const optionalShortText = (max = 200) => z.string().trim().max(max).optional().or(z.literal(""));
export const longText = (max = 5000) => z.string().max(max).optional().or(z.literal(""));

export const stateCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}$/, "State code must be 2 digits");
