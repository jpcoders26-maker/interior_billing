import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;
