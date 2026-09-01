import { z } from "zod";

export const roleSchema = z.enum(["admin", "user"]);

export const upsertUserSchema = z.object({
  id: z.string().trim().max(64).optional().or(z.literal("")),
  userId: z
    .string()
    .trim()
    .min(2, "User ID must be at least 2 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "User ID may only contain letters, numbers, dots, underscores and hyphens"),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  role: roleSchema.default("user"),
  active: z.boolean().default(true),
  // required on create, optional on update (blank = keep existing hash)
  password: z.string().max(200).optional().or(z.literal("")),
});
export type UpsertUserInput = z.infer<typeof upsertUserSchema>;

export const deleteUserSchema = z.object({ id: z.string().trim().min(1).max(64) });
