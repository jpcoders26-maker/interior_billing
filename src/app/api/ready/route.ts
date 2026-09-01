import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness probe — can this instance actually serve traffic (DB reachable)? Used by Docker/orchestrator healthchecks. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch (err) {
    logger.error({ err }, "Readiness check failed: database unreachable");
    return NextResponse.json({ status: "unavailable", database: "down" }, { status: 503 });
  }
}
