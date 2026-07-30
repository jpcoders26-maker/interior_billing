import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/server/session.js";
import { STORE, publicUser, upsertUser, findUser } from "../../../lib/server/store.js";

export const runtime = "nodejs";

async function requireAdmin() {
  const u = await currentUser();
  if (!u) return { error: "Unauthenticated", status: 401 };
  if (u.role !== "admin") return { error: "Admins only", status: 403 };
  return { user: u };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  return NextResponse.json({ users: STORE.users.map(publicUser) });
}

export async function POST(req) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.userId || !body.name) return NextResponse.json({ error: "User ID and name are required" }, { status: 400 });
  if (!body.id) {
    const clash = findUser(body.userId);
    if (clash) return NextResponse.json({ error: "That User ID already exists" }, { status: 409 });
  }
  const u = upsertUser(body);
  return NextResponse.json({ user: publicUser(u) });
}

export async function DELETE(req) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await req.json().catch(() => ({}));
  const idx = STORE.users.findIndex((u) => u.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (STORE.users[idx].userId === gate.user.userId) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  STORE.users.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
