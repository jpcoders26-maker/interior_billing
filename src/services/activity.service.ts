import { prisma } from "@/lib/server/prisma";
import type { ActivityEntryInput } from "@/lib/validation/activity";

const MAX_RETURNED = 500;

function toClientShape(row: { who: string; action: string; at: string }): ActivityEntryInput {
  return { who: row.who, action: row.action, at: row.at };
}

export async function listActivity(): Promise<ActivityEntryInput[]> {
  const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: MAX_RETURNED });
  return rows.map(toClientShape);
}

/**
 * The activity log has no client-generated id (Workspace.jsx's `record()`
 * just prepends `{ who, action, at }`), and it's append-only — nothing in
 * the UI edits or deletes a log entry. So instead of the delete+upsert
 * pattern the other entities use, this only ever *inserts*: the incoming
 * array is newest-first, so anything beyond the current row count is new.
 * Existing rows are never touched or removed by this endpoint, which is the
 * right default for an audit trail (see SECURITY.md §14).
 */
export async function appendActivity(items: ActivityEntryInput[]): Promise<ActivityEntryInput[]> {
  const existingCount = await prisma.activityLog.count();
  const newCount = items.length - existingCount;
  if (newCount > 0) {
    const newest = items.slice(0, newCount).reverse();
    for (const entry of newest) {
      await prisma.activityLog.create({ data: { who: entry.who, action: entry.action, at: entry.at } });
    }
  }
  return listActivity();
}
