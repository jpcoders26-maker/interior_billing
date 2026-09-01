import { z } from "zod";
import { stateCodeSchema } from "./common";

export const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters (letters/numbers)")
    .optional()
    .or(z.literal("")),
  stateCode: stateCodeSchema,
  // data: URL, same pattern as document uploads — capped generously since a
  // logo is small but browsers can produce large PNGs.
  logo: z.string().max(3_000_000).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  bank: z.object({
    name: z.string().trim().max(200).optional().or(z.literal("")),
    acc: z.string().trim().max(40).optional().or(z.literal("")),
    ifsc: z.string().trim().max(20).optional().or(z.literal("")),
    upi: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  terms: z.string().max(4000).optional().or(z.literal("")),
});
export type CompanyInput = z.infer<typeof companySchema>;
