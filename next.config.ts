import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Static (non-nonce) CSP — see SECURITY.md §10 for the full rationale. A
// nonce-based CSP (Next's own recommended strict approach) would force every
// page to render dynamically and can't authorize React inline `style={{}}`
// attributes (this app uses those for its progress bars in
// SubscriptionView/ProjectsView — CSP's style-src has no nonce mechanism for
// the style *attribute*, only for <style> elements), and there's no browser
// available in this environment to verify a stricter policy doesn't silently
// break hydration. `'unsafe-inline'` on script-src is also what Next.js's own
// docs use for the no-nonce case, covering the framework's inline hydration
// payload. Everything else here is fully locked down: no cross-origin
// scripts/frames/objects, no clickjacking, no base-tag hijacking.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
  // HSTS only makes sense once TLS is actually terminated in front of the
  // app (see docs/DEPLOYMENT.md) — it's a no-op over plain HTTP, and the
  // reverse-proxy examples in docs/DOCKER.md/DEPLOYMENT.md always terminate
  // TLS before traffic reaches this app.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for the Docker runtime stage — see
  // Dockerfile/docs/DOCKER.md. Next's dependency tracer doesn't always pick
  // up Prisma's native query-engine binary, so the Dockerfile copies
  // node_modules/.prisma and node_modules/@prisma/client in manually.
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
