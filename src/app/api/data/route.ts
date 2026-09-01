import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { toErrorResponse } from "@/lib/server/http";
import { getWorkspaceState } from "@/services/state.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const data = await getWorkspaceState();
    return NextResponse.json({ data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
