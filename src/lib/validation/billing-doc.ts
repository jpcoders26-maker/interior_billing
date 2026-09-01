import { z } from "zod";

// Shared line-item tree for both quotes and invoices — see
// docs/ARCHITECTURE-AUDIT.md §4.4 for why this stays a validated Json column
// instead of normalized Room/Item tables. Mirrors src/lib/billing.js
// (`lineAmount`/`docTotals`) and src/components/views/DocEditor.jsx exactly:
// room/item ids are client-generated numbers (src/lib/format.js `uid()`),
// and each item is one of three pricing modes.

const gstRateSchema = z.number().min(0).max(100).optional();
const hsnSchema = z.string().trim().max(20).optional().or(z.literal(""));
const descSchema = z.string().trim().max(300).default("");
const itemId = z.number().finite();

const sqftItemSchema = z.object({
  id: itemId,
  desc: descSchema,
  hsn: hsnSchema,
  mode: z.literal("sqft"),
  length: z.coerce.number().finite().min(0).max(100_000),
  width: z.coerce.number().finite().min(0).max(100_000),
  units: z.coerce.number().finite().min(0).max(100_000),
  rate: z.coerce.number().finite().min(0).max(10_000_000),
  gstRate: gstRateSchema,
});

const qtyItemSchema = z.object({
  id: itemId,
  desc: descSchema,
  hsn: hsnSchema,
  mode: z.literal("qty"),
  qty: z.coerce.number().finite().min(0).max(1_000_000),
  unit: z.string().trim().max(30).optional().or(z.literal("")),
  rate: z.coerce.number().finite().min(0).max(10_000_000),
  gstRate: gstRateSchema,
});

const directItemSchema = z.object({
  id: itemId,
  desc: descSchema,
  hsn: hsnSchema,
  mode: z.literal("direct"),
  amount: z.coerce.number().finite().min(0).max(100_000_000),
  gstRate: gstRateSchema,
});

export const lineItemSchema = z.discriminatedUnion("mode", [sqftItemSchema, qtyItemSchema, directItemSchema]);

export const roomSchema = z.object({
  id: z.number().finite(),
  name: z.string().trim().min(1).max(200),
  items: z.array(lineItemSchema).max(500),
});

export const roomsSchema = z.array(roomSchema).max(200).default([]);
