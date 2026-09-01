// The frontend (unchanged) uses lowercase string literals for tax mode and
// status ("gst" | "nogst", "draft" | "sent" | ...); Postgres stores them as
// real enums for integrity. These map between the two at the API boundary.
import { InvoiceStatus, QuoteStatus, TaxMode } from "@prisma/client";

export const taxModeToDb = (v: "gst" | "nogst"): TaxMode => (v === "gst" ? TaxMode.GST : TaxMode.NOGST);
export const taxModeFromDb = (v: TaxMode): "gst" | "nogst" => (v === TaxMode.GST ? "gst" : "nogst");

const quoteStatusMap: Record<string, QuoteStatus> = {
  draft: QuoteStatus.DRAFT,
  sent: QuoteStatus.SENT,
  accepted: QuoteStatus.ACCEPTED,
  rejected: QuoteStatus.REJECTED,
};
const quoteStatusMapInverse = Object.fromEntries(
  Object.entries(quoteStatusMap).map(([k, v]) => [v, k])
) as Record<QuoteStatus, string>;
export const quoteStatusToDb = (v: string): QuoteStatus => quoteStatusMap[v] ?? QuoteStatus.DRAFT;
export const quoteStatusFromDb = (v: QuoteStatus): string => quoteStatusMapInverse[v];

const invoiceStatusMap: Record<string, InvoiceStatus> = {
  unpaid: InvoiceStatus.UNPAID,
  paid: InvoiceStatus.PAID,
  overdue: InvoiceStatus.OVERDUE,
};
const invoiceStatusMapInverse = Object.fromEntries(
  Object.entries(invoiceStatusMap).map(([k, v]) => [v, k])
) as Record<InvoiceStatus, string>;
export const invoiceStatusToDb = (v: string): InvoiceStatus => invoiceStatusMap[v] ?? InvoiceStatus.UNPAID;
export const invoiceStatusFromDb = (v: InvoiceStatus): string => invoiceStatusMapInverse[v];
