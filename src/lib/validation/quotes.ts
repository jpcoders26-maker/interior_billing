import { z } from "zod";
import { dateOnlySchema, idSchema, moneySchema, percentSchema } from "./common";
import { roomsSchema } from "./billing-doc";

export const quoteStatusSchema = z.enum(["draft", "sent", "accepted", "rejected"]);

export const quoteSchema = z.object({
  id: idSchema,
  number: z.string().trim().min(1).max(60),
  taxMode: z.enum(["gst", "nogst"]).default("gst"),
  clientId: idSchema,
  projectId: idSchema.optional().or(z.literal("")),
  date: dateOnlySchema,
  status: quoteStatusSchema.default("draft"),
  gstRate: percentSchema.default(18),
  discount: moneySchema.default(0),
  rooms: roomsSchema,
});
export type QuoteInput = z.infer<typeof quoteSchema>;
export const quoteListSchema = z.array(quoteSchema).max(20_000);
