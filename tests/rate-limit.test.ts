import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/server/rate-limit";

// REDIS_URL is unset in the test environment, so these exercise the
// in-memory fallback path (see src/lib/server/rate-limit.ts) — the same
// counting logic the Redis Lua script implements, just process-local.
describe("rateLimit (in-memory fallback)", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 1; i <= 3; i++) {
      const result = await rateLimit({ key, limit: 3, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3 - i);
    }
    const blocked = await rateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("keeps separate counters per key", async () => {
    const keyA = `test:${crypto.randomUUID()}`;
    const keyB = `test:${crypto.randomUUID()}`;
    await rateLimit({ key: keyA, limit: 1, windowMs: 60_000 });
    const blockedA = await rateLimit({ key: keyA, limit: 1, windowMs: 60_000 });
    const allowedB = await rateLimit({ key: keyB, limit: 1, windowMs: 60_000 });
    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const first = await rateLimit({ key, limit: 1, windowMs: 20 });
    expect(first.allowed).toBe(true);
    await new Promise((r) => setTimeout(r, 40));
    const afterWindow = await rateLimit({ key, limit: 1, windowMs: 20 });
    expect(afterWindow.allowed).toBe(true);
  });
});
