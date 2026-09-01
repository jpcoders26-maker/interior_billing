import { prisma } from "@/lib/server/prisma";
import { invoiceStatusFromDb, invoiceStatusToDb, taxModeFromDb, taxModeToDb } from "@/lib/server/enum-map";
import { toDateOnly, toNum } from "@/lib/server/serialize";
import type { InvoiceInput } from "@/lib/validation/invoices";
import type { Invoice, Prisma } from "@prisma/client";

export interface InvoiceDTO {
  id: string;
  number: string;
  docType: string;
  taxMode: "gst" | "nogst";
  clientId: string;
  projectId: string;
  date: string;
  due: string;
  status: string;
  gstRate: number;
  discount: number;
  rooms: unknown;
}

function toClientShape(row: Invoice): InvoiceDTO {
  return {
    id: row.id,
    number: row.number,
    docType: row.docType,
    taxMode: taxModeFromDb(row.taxMode),
    clientId: row.clientId,
    projectId: row.projectId ?? "",
    date: toDateOnly(row.date),
    due: row.dueDate ? toDateOnly(row.dueDate) : "",
    status: invoiceStatusFromDb(row.status),
    gstRate: toNum(row.gstRate),
    discount: toNum(row.discount),
    rooms: row.rooms,
  };
}

export async function listInvoices(): Promise<InvoiceDTO[]> {
  const rows = await prisma.invoice.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toClientShape);
}

export async function replaceInvoices(items: InvoiceInput[]): Promise<InvoiceDTO[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((i) => i.id);
    await tx.invoice.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const fields = {
        number: item.number,
        docType: item.docType,
        taxMode: taxModeToDb(item.taxMode),
        clientId: item.clientId,
        projectId: item.projectId || null,
        date: item.date,
        dueDate: item.due instanceof Date ? item.due : null,
        status: invoiceStatusToDb(item.status),
        gstRate: item.gstRate,
        discount: item.discount,
        rooms: item.rooms as Prisma.InputJsonValue,
      };
      await tx.invoice.upsert({
        where: { id: item.id },
        create: { id: item.id, ...fields },
        update: fields,
      });
    }
    const rows = await tx.invoice.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toClientShape);
  });
}
