# syntax=docker/dockerfile:1

# Multi-stage build: deps (install + native compile) -> builder (next build)
# -> runner (only the standalone server + static assets ship in the final
# image). See docs/DOCKER.md for the full rationale and operational notes.

FROM node:22-alpine AS base
# libc6-compat: Next.js on Alpine needs this glibc-compat shim.
RUN apk add --no-cache libc6-compat

# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
# python3/make/g++: argon2 is a native addon and needs a build toolchain to
# compile during `npm ci` on Alpine (musl has no prebuilt binaries for it).
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder values only — next build needs *a* DATABASE_URL to statically
# analyze route modules, but nothing in this app queries the DB at build
# time (all routes are dynamic). Real values are injected at runtime,
# never baked into the image (see docs/DOCKER.md "Secrets" and Phase 23).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next's dependency tracer for `output: standalone` doesn't reliably pick up
# Prisma's native query-engine binary, so it's copied in explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run the standalone server directly as PID 1 (not via `npm start`) so it
# receives SIGTERM directly and can shut down gracefully — see
# src/instrumentation.ts and docs/DOCKER.md "Graceful shutdown".
CMD ["node", "server.js"]
