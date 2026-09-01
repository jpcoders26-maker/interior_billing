import { z } from "zod";
import { epochMsSchema } from "./common";
import { PLANS } from "@/lib/plans";

const planIds = PLANS.map((p) => p.id) as [string, ...string[]];

export const subscriptionSchema = z.object({
  plan: z.enum(planIds),
  status: z.enum(["active", "inactive"]),
  startedAt: epochMsSchema,
  expiresAt: epochMsSchema,
});
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
