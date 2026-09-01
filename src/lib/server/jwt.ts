// JWT session token helpers (jose). Next.js 16's `proxy` convention (the
// renamed `middleware`) always runs on the nodejs runtime now, so this no
// longer needs to be edge-safe — jose works fine either way, so it stays.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { requireAuthSecret } from "./env";

export const COOKIE = "tw_token";

export interface SessionPayload extends JWTPayload {
  sub: string;
  userId: string;
  name: string;
  role: "admin" | "user";
}

// Resolved lazily on first actual use, not at module scope (see env.ts) —
// and memoized after that, since it can't change without a process restart.
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (!cachedSecret) cachedSecret = new TextEncoder().encode(requireAuthSecret());
  return cachedSecret;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
