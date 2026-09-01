import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signToken, verifyToken, type SessionPayload } from "@/lib/server/jwt";

const payload: SessionPayload = { sub: "U1", userId: "admin", name: "Admin", role: "admin" };

describe("session tokens (src/lib/server/jwt.ts)", () => {
  it("round-trips a valid token", async () => {
    const token = await signToken(payload);
    const verified = await verifyToken(token);
    expect(verified?.userId).toBe("admin");
    expect(verified?.role).toBe("admin");
  });

  it("rejects a tampered token (payload modified after signing)", async () => {
    const token = await signToken(payload);
    const [header, , sig] = token.split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ ...payload, role: "admin", sub: "U2" })).toString("base64url");
    const tampered = `${header}.${tamperedBody}.${sig}`;
    expect(await verifyToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret (e.g. a stolen dev secret vs. real prod secret)", async () => {
    const wrongSecret = new TextEncoder().encode("a-completely-different-secret-value-not-the-real-one");
    const forged = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(wrongSecret);
    expect(await verifyToken(forged)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const { requireAuthSecret } = await import("@/lib/server/env");
    const secret = new TextEncoder().encode(requireAuthSecret());
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1) // already expired
      .sign(secret);
    expect(await verifyToken(expired)).toBeNull();
  });

  it("rejects garbage input without throwing", async () => {
    expect(await verifyToken("not.a.jwt")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken(null)).toBeNull();
    expect(await verifyToken(undefined)).toBeNull();
  });

  it("rejects a token with alg=none (classic JWT algorithm-confusion attack)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const noneToken = `${header}.${body}.`;
    expect(await verifyToken(noneToken)).toBeNull();
  });
});
