import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/server/session.js";
import { STORE, STATE_KEYS } from "../../../../lib/server/store.js";

export async function PUT(req, { params }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const key = params.key;
  if (!STATE_KEYS.includes(key)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  if (!("value" in body)) {
    return NextResponse.json({ error: "Missing value" }, { status: 400 });
  }
  STORE[key] = body.value;
  return NextResponse.json({ ok: true });
}
