import { cookies } from "next/headers";
import { COOKIE, verifyToken } from "./jwt";

export interface CurrentUser {
  id: string;
  userId: string;
  name: string;
  role: "admin" | "user";
}

export async function currentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { id: payload.sub, userId: payload.userId, name: payload.name, role: payload.role };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Unauthenticated");
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}
