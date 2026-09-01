import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe — is the process up and serving requests? No dependency checks (that's /api/ready). */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
