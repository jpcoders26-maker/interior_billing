import { z } from "zod";
import { idSchema, moneySchema } from "./common";

export const workerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Name is required").max(120),
  skill: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  rate: moneySchema,
});
export type WorkerInput = z.infer<typeof workerSchema>;
export const workerListSchema = z.array(workerSchema).max(5000);

export const allocationSchema = z.object({
  workerId: idSchema,
  projectId: idSchema,
});
export type AllocationInput = z.infer<typeof allocationSchema>;
export const allocationListSchema = z.array(allocationSchema).max(5000);
