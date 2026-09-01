import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/server/auth";

describe("password hashing", () => {
  it("hashes with argon2id and verifies correctly", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "wrong password")).toBe(false);
  });

  it("still verifies legacy bcrypt hashes", async () => {
    const legacyHash = bcrypt.hashSync("admin123", 10);
    expect(await verifyPassword(legacyHash, "admin123")).toBe(true);
    expect(await verifyPassword(legacyHash, "wrong")).toBe(false);
  });

  it("flags bcrypt hashes (and only bcrypt hashes) as needing an upgrade", async () => {
    const legacyHash = bcrypt.hashSync("admin123", 10);
    const modernHash = await hashPassword("admin123");
    expect(needsRehash(legacyHash)).toBe(true);
    expect(needsRehash(modernHash)).toBe(false);
  });

  it("never returns true from verifyPassword for a malformed/unrecognized hash", async () => {
    expect(await verifyPassword("not-a-real-hash", "anything")).toBe(false);
    expect(await verifyPassword("", "anything")).toBe(false);
  });
});
