import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUser, publicUser } from "../../../../lib/server/store.js";
import { signToken, COOKIE } from "../../../../lib/server/jwt.js";

export const runtime = "nodejs";

export async function POST(req) {
  const { userId, password } = await req.json().catch(() => ({}));
  const user = findUser(userId);
  if (!user || !user.active || !bcrypt.compareSync(String(password || ""), user.hash)) {
    return NextResponse.json({ error: "Invalid user ID or password" }, { status: 401 });
  }
  const token = await signToken({ sub: user.id, userId: user.userId, name: user.name, role: user.role });
  const res = NextResponse.json({ user: publicUser(user) });
  res.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
