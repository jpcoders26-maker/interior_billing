// Shared API route helpers: consistent error shape, and never leak internals
// (stack traces, Prisma error text, file paths) to the client — see
// SECURITY.md §18 and Phase 18 of the brief. Every route handler should
// funnel unexpected errors through `toErrorResponse`.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logger } from "./logger";
import { ForbiddenError, UnauthenticatedError } from "./session";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}

/** Convert any thrown error into a safe JSON response, logging the real cause server-side. */
export function toErrorResponse(err: unknown, requestId?: string): NextResponse {
  if (err instanceof UnauthenticatedError) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message || "Forbidden" }, { status: 403 });
  }
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request data", details: err.flatten().fieldErrors },
      { status: 400 }
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint, P2003 = FK constraint, P2025 = record not found
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A record with those details already exists" }, { status: 409 });
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        { error: "This record is referenced by other data and cannot be changed this way" },
        { status: 409 }
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.error({ err, code: err.code, requestId }, "Unhandled Prisma error");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  logger.error({ err, requestId }, "Unhandled error in API route");
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}
