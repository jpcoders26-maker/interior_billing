import { prisma } from "@/lib/server/prisma";
import { quoteStatusFromDb, quoteStatusToDb, taxModeFromDb, taxModeToDb } from "@/lib/server/enum-map";
import { toDateOnly, toNum } from "@/lib/server/serialize";
import type { QuoteInput } from "@/lib/validation/quotes";
import type { Prisma, Quote } from "@prisma/client";

export interface QuoteDTO {
  id: string;
  number: string;
  taxMode: "gst" | "nogst";
  clientId: string;
  projectId: string;
  date: string;
  status: string;
  gstRate: number;
  discount: number;
  rooms: unknown;
}

function toClientShape(row: Quote): QuoteDTO {
  return {
    id: row.id,
    number: row.number,
    taxMode: taxModeFromDb(row.taxMode),
    clientId: row.clientId,
    projectId: row.projectId ?? "",
    date: toDateOnly(row.date),
    status: quoteStatusFromDb(row.status),
    gstRate: toNum(row.gstRate),
    discount: toNum(row.discount),
    rooms: row.rooms,
  };
}

export async function listQuotes(): Promise<QuoteDTO[]> {
  const rows = await prisma.quote.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toClientShape);
}

export async function replaceQuotes(items: QuoteInput[]): Promise<QuoteDTO[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((q) => q.id);
    await tx.quote.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const fields = {
        number: item.number,
        taxMode: taxModeToDb(item.taxMode),
        clientId: item.clientId,
        projectId: item.projectId || null,
        date: item.date,
        status: quoteStatusToDb(item.status),
        gstRate: item.gstRate,
        discount: item.discount,
        rooms: item.rooms as Prisma.InputJsonValue,
      };
      await tx.quote.upsert({
        where: { id: item.id },
        create: { id: item.id, ...fields },
        update: fields,
      });
    }
    const rows = await tx.quote.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toClientShape);
  });
}
