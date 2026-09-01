import { prisma } from "@/lib/server/prisma";
import { parseDataUrl, toDataUrl, type DocumentInput } from "@/lib/validation/documents";

export interface DocumentDTO {
  id: string;
  projectId: string;
  name: string;
  kind: string;
  size: string;
  date: string;
  type: string;
  dataUrl?: string;
}

function toClientShape(row: {
  id: string;
  projectId: string;
  name: string;
  kind: string;
  sizeLabel: string | null;
  date: Date;
  mimeType: string | null;
  fileData: Uint8Array | null;
}): DocumentDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    kind: row.kind,
    size: row.sizeLabel ?? "",
    date: row.date.toISOString().slice(0, 10),
    type: row.mimeType ?? "",
    dataUrl: row.fileData && row.mimeType ? toDataUrl(row.mimeType, Buffer.from(row.fileData)) : undefined,
  };
}

export async function listDocuments(): Promise<DocumentDTO[]> {
  const rows = await prisma.document.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toClientShape);
}

export async function replaceDocuments(items: DocumentInput[]): Promise<DocumentDTO[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((d) => d.id);
    await tx.document.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const parsed = item.dataUrl ? parseDataUrl(item.dataUrl) : null;
      const data = {
        projectId: item.projectId,
        name: item.name,
        kind: item.kind,
        sizeLabel: item.size || null,
        date: item.date ? new Date(item.date) : new Date(),
        mimeType: parsed?.mimeType ?? (item.type || null),
        sizeBytes: parsed ? parsed.buffer.byteLength : null,
        fileData: parsed ? new Uint8Array(parsed.buffer) : undefined,
      };
      await tx.document.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
    }
    const rows = await tx.document.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toClientShape);
  });
}
