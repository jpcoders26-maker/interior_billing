import { prisma } from "@/lib/server/prisma";
import { toEpochMs } from "@/lib/server/serialize";
import type { SubscriptionInput } from "@/lib/validation/subscription";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function toClientShape(row: { plan: string; status: string; startedAt: Date; expiresAt: Date }) {
  return { plan: row.plan, status: row.status, startedAt: toEpochMs(row.startedAt), expiresAt: toEpochMs(row.expiresAt) };
}

export async function getSubscription() {
  const row = await prisma.subscription.findUnique({ where: { id: 1 } });
  if (!row) {
    const now = new Date();
    const created = await prisma.subscription.create({
      data: { id: 1, plan: "Free Trial", status: "active", startedAt: now, expiresAt: new Date(now.getTime() + FOURTEEN_DAYS_MS) },
    });
    return toClientShape(created);
  }
  return toClientShape(row);
}

export async function saveSubscription(input: SubscriptionInput) {
  const row = await prisma.subscription.upsert({
    where: { id: 1 },
    create: { id: 1, plan: input.plan, status: input.status, startedAt: input.startedAt, expiresAt: input.expiresAt },
    update: { plan: input.plan, status: input.status, startedAt: input.startedAt, expiresAt: input.expiresAt },
  });
  return toClientShape(row);
}
