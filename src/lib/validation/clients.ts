import { z } from "zod";
import { idSchema, stateCodeSchema } from "./common";

export const clientSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Client name is required").max(200),
  contact: z.string().trim().max(120).optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters (letters/numbers) — leave blank for B2C")
    .optional()
    .or(z.literal("")),
  stateCode: stateCodeSchema,
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().max(200).optional().or(z.literal("")),
  billing: z.string().trim().max(500).optional().or(z.literal("")),
  shipping: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ClientInput = z.infer<typeof clientSchema>;
export const clientListSchema = z.array(clientSchema).max(5000);
