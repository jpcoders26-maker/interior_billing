// Prisma Client singleton.
//
// Why: every `new PrismaClient()` opens its own connection pool. In dev,
// Next.js's module hot-reload would otherwise create a fresh client (and a
// fresh pool) on every edit, quickly exhausting Postgres's connection limit.
// In production this app runs as a small number of long-lived Node
// processes (see docker-compose*.yml — not a per-request serverless
// function), so a single shared client per process is correct and the
// standard `?connection_limit=` query param on DATABASE_URL is enough pool
// sizing; there's no need for pgBouncer/Accelerate here. If this is ever
// deployed to a serverless/edge platform with many concurrent execution
// contexts, revisit with an external pooler.
import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn"],
  });

if (!isProduction) globalForPrisma.prisma = prisma;
