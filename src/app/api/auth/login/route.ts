import { NextResponse } from "next/server";
import { COOKIE, signToken } from "@/lib/server/jwt";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/server/auth";
import { toErrorResponse, parseJsonBody } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { isProduction } from "@/lib/server/env";
import { loginSchema } from "@/lib/validation/auth";
import { findUserByLoginId } from "@/services/users.service";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await parseJsonBody(req));
    const user = await findUserByLoginId(body.userId);

    // Constant-shape response either way — never reveal whether the
    // userId exists (Phase 7: avoid user enumeration). A dummy hash verify
    // keeps the timing profile close to the real path when the account is
    // missing or inactive.
    const hash = user?.active ? user.passwordHash : "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const valid = await verifyPassword(hash, body.password);

    if (!user || !user.active || !valid) {
      logger.warn({ userId: body.userId }, "Failed login attempt");
      return NextResponse.json({ error: "Invalid user ID or password" }, { status: 401 });
    }

    if (needsRehash(user.passwordHash)) {
      const upgraded = await hashPassword(body.password);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: upgraded } });
    }

    const token = await signToken({
      sub: user.id,
      userId: user.userId,
      name: user.name,
      role: user.role === "ADMIN" ? "admin" : "user",
    });

    const res = NextResponse.json({
      user: { id: user.id, userId: user.userId, name: user.name, email: user.email ?? "", role: user.role === "ADMIN" ? "admin" : "user", active: user.active },
    });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
