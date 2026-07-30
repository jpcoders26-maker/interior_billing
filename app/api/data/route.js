import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/server/session.js";
import { STORE } from "../../../lib/server/store.js";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { users, ...safe } = STORE; // never send users / password hashes
  return NextResponse.json({ data: safe });
}
