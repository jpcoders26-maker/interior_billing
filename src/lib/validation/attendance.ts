import { z } from "zod";
import { dateOnlySchema, idSchema } from "./common";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM")
  .optional()
  .or(z.literal(""));

export const attendanceEntrySchema = z.object({
  id: idSchema,
  workerId: idSchema,
  date: dateOnlySchema,
  inTime: timeSchema,
  outTime: timeSchema,
  // which site the worker was at that day — see src/components/views/Attendance.jsx
  projectId: idSchema.optional().or(z.literal("")),
});
export type AttendanceInput = z.infer<typeof attendanceEntrySchema>;
export const attendanceListSchema = z.array(attendanceEntrySchema).max(50_000);
