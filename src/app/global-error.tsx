"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself, which app/error.tsx
// cannot — must render its own <html>/<body> since the root layout may not
// have rendered. Kept deliberately plain (no Tailwind classes depend on
// globals.css having loaded).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong</p>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: "0.75rem", background: "#4f46e5", color: "white", fontWeight: 600, border: "none" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
