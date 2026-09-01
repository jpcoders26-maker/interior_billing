import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/session";
import { toErrorResponse, parseJsonBody, BadRequestError } from "@/lib/server/http";
import { STATE_KEYS, saveStateSlice, type StateKey } from "@/services/state.service";

export const runtime = "nodejs";

function isStateKey(key: string): key is StateKey {
  return (STATE_KEYS as readonly string[]).includes(key);
}

export async function PUT(req: Request, context: { params: Promise<{ key: string }> }) {
  try {
    const user = await requireUser();
    const { key } = await context.params;
    if (!isStateKey(key)) throw new BadRequestError("Unknown resource");

    const body = (await parseJsonBody(req)) as { value?: unknown };
    if (!("value" in body)) throw new BadRequestError("Missing value");

    const saved = await saveStateSlice(key, body.value, user);
    return NextResponse.json({ ok: true, value: saved });
  } catch (err) {
    return toErrorResponse(err);
  }
}
