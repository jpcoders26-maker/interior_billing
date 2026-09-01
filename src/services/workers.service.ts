import { prisma } from "@/lib/server/prisma";
import { toNum } from "@/lib/server/serialize";
import type { AllocationInput, WorkerInput } from "@/lib/validation/workers";

export interface WorkerDTO {
  id: string;
  name: string;
  skill: string;
  phone: string;
  rate: number;
}

function toClientShape(row: { id: string; name: string; skill: string | null; phone: string | null; rate: unknown }): WorkerDTO {
  return { id: row.id, name: row.name, skill: row.skill ?? "", phone: row.phone ?? "", rate: toNum(row.rate) };
}

export async function listWorkers(): Promise<WorkerDTO[]> {
  const rows = await prisma.worker.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toClientShape);
}

export async function replaceWorkers(items: WorkerInput[]): Promise<WorkerDTO[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((w) => w.id);
    await tx.worker.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const data = { name: item.name, skill: item.skill || null, phone: item.phone || null, rate: item.rate };
      await tx.worker.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
    }
    const rows = await tx.worker.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toClientShape);
  });
}

export async function listAllocations(): Promise<AllocationInput[]> {
  const rows = await prisma.workerAllocation.findMany();
  return rows.map((r) => ({ workerId: r.workerId, projectId: r.projectId }));
}

export async function replaceAllocations(items: AllocationInput[]): Promise<AllocationInput[]> {
  return prisma.$transaction(async (tx) => {
    const incomingWorkerIds = items.map((a) => a.workerId);
    await tx.workerAllocation.deleteMany({
      where: { workerId: { notIn: incomingWorkerIds.length ? incomingWorkerIds : ["__none__"] } },
    });
    for (const item of items) {
      await tx.workerAllocation.upsert({
        where: { workerId: item.workerId },
        create: { workerId: item.workerId, projectId: item.projectId },
        update: { projectId: item.projectId },
      });
    }
    const rows = await tx.workerAllocation.findMany();
    return rows.map((r) => ({ workerId: r.workerId, projectId: r.projectId }));
  });
}
