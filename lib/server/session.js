import { cookies } from "next/headers";
import { COOKIE, verifyToken } from "./jwt.js";

export async function currentUser() {
  const token = cookies().get(COOKIE)?.value;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { id: payload.sub, userId: payload.userId, name: payload.name, role: payload.role };
}
