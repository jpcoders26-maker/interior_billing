import { z } from "zod";
import { dateOnlySchema, idSchema, moneySchema } from "./common";

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Project name is required").max(200),
  clientId: idSchema,
  status: z.enum(["planning", "active", "completed", "onhold"]).default("planning"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  start: dateOnlySchema.optional().or(z.literal("")),
  due: dateOnlySchema.optional().or(z.literal("")),
  value: moneySchema.optional(),
});
export type ProjectInput = z.infer<typeof projectSchema>;
export const projectListSchema = z.array(projectSchema).max(5000);
