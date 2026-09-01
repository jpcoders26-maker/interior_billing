// Next.js's `register()` hook — runs once when the server process starts.
// Used here purely for graceful shutdown (Phase 36): on SIGTERM/SIGINT
// (what Docker/Kubernetes send to stop a container), stop accepting new
// Prisma work and close the connection pool cleanly instead of letting
// in-flight queries get killed mid-transaction. The actual process.on/
// process.exit calls live in graceful-shutdown.ts, imported dynamically
// only here — see that file's header comment for why.
export const runtime = "nodejs";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerGracefulShutdown } = await import("@/lib/server/graceful-shutdown");
  registerGracefulShutdown();
}
