import { prisma } from "@/lib/server/prisma";
import { toDateOnly, toNumOrNull } from "@/lib/server/serialize";
import type { ProjectInput } from "@/lib/validation/projects";

// The Zod input schema transforms date strings -> Date objects (so it can
// validate them); the shape sent back to the browser needs the opposite —
// plain "YYYY-MM-DD" strings and plain numbers, exactly what
// <input type="date"> and the money-formatting helpers already expect. Kept
// as an explicit, separate type rather than reusing ProjectInput so the two
// directions can't be silently confused.
export interface ProjectDTO {
  id: string;
  name: string;
  clientId: string;
  status: string;
  progress: number;
  start: string;
  due: string;
  value?: number;
}

function toClientShape(row: {
  id: string;
  name: string;
  clientId: string;
  status: string;
  progress: number;
  start: Date | null;
  due: Date | null;
  value: unknown;
}): ProjectDTO {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    status: row.status,
    progress: row.progress,
    start: toDateOnly(row.start),
    due: toDateOnly(row.due),
    value: toNumOrNull(row.value) ?? undefined,
  };
}

export async function listProjects(): Promise<ProjectDTO[]> {
  const rows = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toClientShape);
}

export async function replaceProjects(items: ProjectInput[]): Promise<ProjectDTO[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((p) => p.id);
    await tx.project.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const data = {
        name: item.name,
        clientId: item.clientId,
        status: item.status,
        progress: item.progress,
        start: item.start instanceof Date ? item.start : null,
        due: item.due instanceof Date ? item.due : null,
        value: item.value ?? null,
      };
      await tx.project.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
    }
    const rows = await tx.project.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toClientShape);
  });
}
