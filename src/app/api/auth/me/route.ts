import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  return NextResponse.json({ user });
}
