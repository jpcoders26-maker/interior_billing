// Password hashing.
//
// New/rotated passwords are hashed with Argon2id (OWASP's current
// recommendation, memory-hard — a materially stronger default than bcrypt
// against GPU/ASIC cracking). Existing accounts seeded before this change may
// still carry a bcrypt hash; `verifyPassword` detects the format by prefix
// and verifies with the matching algorithm, then `needsRehash` tells the
// caller to transparently re-hash with Argon2id on that successful login
// (the standard "lazy migration" pattern — no forced password reset, no
// downtime, hashes upgrade themselves as users sign in).
import argon2 from "argon2";
import bcrypt from "bcryptjs";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP minimum recommendation for argon2id
  timeCost: 2,
  parallelism: 1,
};

function isBcryptHash(hash: string): boolean {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** True when the stored hash should be upgraded (i.e. it's still bcrypt). */
export function needsRehash(hash: string): boolean {
  return isBcryptHash(hash);
}
