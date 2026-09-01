import { z } from "zod";
import { dateOnlySchema, idSchema, moneySchema, percentSchema } from "./common";
import { roomsSchema } from "./billing-doc";

export const invoiceStatusSchema = z.enum(["unpaid", "paid", "overdue"]);
export const invoiceDocTypeSchema = z.enum(["Tax Invoice", "Bill of Supply", "Proforma Invoice"]);

export const invoiceSchema = z.object({
  id: idSchema,
  number: z.string().trim().min(1).max(60),
  docType: invoiceDocTypeSchema,
  taxMode: z.enum(["gst", "nogst"]).default("gst"),
  clientId: idSchema,
  projectId: idSchema.optional().or(z.literal("")),
  date: dateOnlySchema,
  due: dateOnlySchema.optional().or(z.literal("")),
  status: invoiceStatusSchema.default("unpaid"),
  gstRate: percentSchema.default(18),
  discount: moneySchema.default(0),
  rooms: roomsSchema,
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export const invoiceListSchema = z.array(invoiceSchema).max(20_000);
