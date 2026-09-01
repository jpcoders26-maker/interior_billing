import { z } from "zod";

export const activityEntrySchema = z.object({
  who: z.string().trim().min(1).max(200),
  action: z.string().trim().min(1).max(500),
  at: z.string().trim().max(60),
});
export type ActivityEntryInput = z.infer<typeof activityEntrySchema>;
export const activityListSchema = z.array(activityEntrySchema).max(20_000);
