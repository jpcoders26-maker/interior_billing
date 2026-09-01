import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/session";
import { toErrorResponse, parseJsonBody } from "@/lib/server/http";
import { upsertUserSchema, deleteUserSchema } from "@/lib/validation/users";
import { deleteUser, listUsers, upsertUser } from "@/services/users.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ users: await listUsers() });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = upsertUserSchema.parse(await parseJsonBody(req));
    const user = await upsertUser(body);
    return NextResponse.json({ user });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = deleteUserSchema.parse(await parseJsonBody(req));
    await deleteUser(body.id, admin.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
