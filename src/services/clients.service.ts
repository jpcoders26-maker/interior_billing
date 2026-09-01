import { prisma } from "@/lib/server/prisma";
import type { ClientInput } from "@/lib/validation/clients";

function toClientShape(row: {
  id: string;
  name: string;
  contact: string | null;
  gstin: string | null;
  stateCode: string;
  phone: string | null;
  email: string | null;
  billing: string | null;
  shipping: string | null;
}): ClientInput {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact ?? "",
    gstin: row.gstin ?? "",
    stateCode: row.stateCode,
    phone: row.phone ?? "",
    email: row.email ?? "",
    billing: row.billing ?? "",
    shipping: row.shipping ?? "",
  };
}

export async function listClients(): Promise<ClientInput[]> {
  const rows = await prisma.client.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toClientShape);
}

/**
 * Whole-array replace, matching the existing PUT /api/state/clients contract:
 * the browser always sends the complete, current array after a local edit.
 * Runs as one transaction — deletes rows missing from the incoming array,
 * then upserts every incoming row. A client still referenced by a project,
 * quote, or invoice can't be deleted (see schema.prisma onDelete: Restrict on
 * those FKs); that surfaces as a clean 409 via src/lib/server/http.ts rather
 * than the previous silent orphaning.
 */
export async function replaceClients(items: ClientInput[]): Promise<ClientInput[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((c) => c.id);
    await tx.client.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const data = {
        name: item.name,
        contact: item.contact || null,
        gstin: item.gstin || null,
        stateCode: item.stateCode,
        phone: item.phone || null,
        email: item.email || null,
        billing: item.billing || null,
        shipping: item.shipping || null,
      };
      await tx.client.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
    }
    const rows = await tx.client.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toClientShape);
  });
}
