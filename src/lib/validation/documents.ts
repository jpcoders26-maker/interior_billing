import { z } from "zod";
import { idSchema } from "./common";

// Server-side file-upload hardening (Phase 17). The client still reads the
// file into a data URL (components/views/Documents.jsx, unchanged) and PUTs
// the whole `documents` array — this validates and re-parses that data URL
// server-side instead of trusting it blindly, which the old code never did.
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB, matches the existing client-side cap

// Deliberately an allowlist, not a denylist: anything not explicitly safe to
// store and later hand back to a browser is rejected. Notably excludes
// text/html, image/svg+xml, and any */javascript type — a stored file of
// those types is later opened with `window.location.href = dataUrl`
// (Documents.jsx), so allowing them would be a stored-content/self-XSS-ish
// vector (see docs/ARCHITECTURE-AUDIT.md §2.6 and SECURITY.md §7).
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

const DATA_URL_RE = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+=?=?)$/;

function decodedByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export const documentSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      // strip any path components a hostile filename might carry
      .transform((n) => n.replace(/^.*[/\\]/, "")),
    kind: z.string().trim().max(40).default("File"),
    size: z.string().trim().max(40).optional().or(z.literal("")),
    date: z.string().trim().max(40).optional().or(z.literal("")),
    type: z.string().trim().max(120).optional().or(z.literal("")),
    dataUrl: z.string().max(Math.ceil((MAX_FILE_BYTES * 4) / 3) + 100).optional().or(z.literal("")),
  })
  .superRefine((doc, ctx) => {
    if (!doc.dataUrl) return;
    const match = DATA_URL_RE.exec(doc.dataUrl);
    if (!match) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dataUrl"], message: "Expected a base64 data URL" });
      return;
    }
    const [, mime, base64] = match as unknown as [string, string, string];
    if (!ALLOWED_MIME_TYPES.has(mime.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataUrl"],
        message: `File type "${mime}" is not allowed`,
      });
      return;
    }
    if (decodedByteLength(base64) > MAX_FILE_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dataUrl"], message: "File exceeds the 8MB limit" });
    }
  });
export type DocumentInput = z.infer<typeof documentSchema>;
export const documentListSchema = z.array(documentSchema).max(20_000);

export function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match as unknown as [string, string, string];
  return { mimeType: mime.toLowerCase(), buffer: Buffer.from(base64, "base64") };
}

export function toDataUrl(mimeType: string, buffer: Buffer): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
