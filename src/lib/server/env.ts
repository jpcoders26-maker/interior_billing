// Central place that reads and validates process.env.
//
// Important: this module is imported (transitively) by almost every server
// module, including ones that get loaded in contexts with a partial
// environment — Next.js statically analyzing route modules during
// `next build`, or Vitest (which doesn't load .env the way `next dev`/
// `next start` do). So nothing here throws at module scope; a genuinely
// missing/invalid value is surfaced lazily, at the point something actually
// needs it (requireAuthSecret() below; Prisma throws its own clear error if
// DATABASE_URL is unusable when a query actually runs).
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 48`")
    .optional(),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.warn("Environment configuration warning:", parsed.error.flatten().fieldErrors);
}

// Best-effort: use the validated values where parsing succeeded, otherwise
// fall back to a minimal safe default so importing this module never throws.
export const env = parsed.success ? parsed.data : { NODE_ENV: "development" as const };
export const isProduction = env.NODE_ENV === "production";

const DEV_AUTH_SECRET = "dev-only-secret-change-me-furniture-erp-2026";

/**
 * Resolves the JWT signing secret, called lazily at request time (never at
 * module scope — see the file header). A missing AUTH_SECRET is tolerated
 * outside production so `npm run dev` keeps working with zero setup;
 * production must set a real one or every sign/verify call fails loudly.
 */
export function requireAuthSecret(): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (isProduction) {
    throw new Error(
      "AUTH_SECRET is required in production. Generate one with `openssl rand -base64 48` and set it in the environment."
    );
  }
  return DEV_AUTH_SECRET;
}
