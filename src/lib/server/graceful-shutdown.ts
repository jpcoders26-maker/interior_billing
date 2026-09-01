// Split out from src/instrumentation.ts so the process.on/process.exit
// calls (genuinely unavailable in the Edge runtime) live in a module that's
// only ever dynamically imported from instrumentation.ts's nodejs-only
// branch — keeps Turbopack's Edge-runtime static analysis from flagging
// instrumentation.ts itself, which it inspects even when the calls are
// behind a NEXT_RUNTIME guard at runtime.
import { prisma } from "./prisma";
import { logger } from "./logger";

export function registerGracefulShutdown(): void {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Received shutdown signal, closing database connections");
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error({ err }, "Error while disconnecting Prisma during shutdown");
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
