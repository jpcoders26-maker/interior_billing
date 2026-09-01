import { prisma } from "@/lib/server/prisma";
import { toDateOnly } from "@/lib/server/serialize";
import type { AttendanceInput } from "@/lib/validation/attendance";

export interface AttendanceDTO {
  id: string;
  workerId: string;
  date: string;
  inTime: string;
  outTime: string;
}

function toClientShape(row: { id: string; workerId: string; date: Date; inTime: string | null; outTime: string | null }): AttendanceDTO {
  return { id: row.id, workerId: row.workerId, date: toDateOnly(row.date), inTime: row.inTime ?? "", outTime: row.outTime ?? "" };
}

export async function listAttendance(): Promise<AttendanceDTO[]> {
  const rows = await prisma.attendance.findMany({ orderBy: { date: "asc" } });
  return rows.map(toClientShape);
}

export async function replaceAttendance(items: AttendanceInput[]): Promise<AttendanceDTO[]> {
  return prisma.$transaction(async (tx) => {
    const incomingIds = items.map((a) => a.id);
    await tx.attendance.deleteMany({ where: { id: { notIn: incomingIds.length ? incomingIds : ["__none__"] } } });
    for (const item of items) {
      const data = {
        workerId: item.workerId,
        date: item.date,
        inTime: item.inTime || null,
        outTime: item.outTime || null,
      };
      await tx.attendance.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
    }
    const rows = await tx.attendance.findMany({ orderBy: { date: "asc" } });
    return rows.map(toClientShape);
  });
}
