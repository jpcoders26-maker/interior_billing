// Structured logging (pino). Redacts anything that could leak a credential —
// see SECURITY.md §14. Never log raw request bodies for auth endpoints.
import pino from "pino";
import { isProduction } from "./env";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "token",
      "*.token",
      "cookie",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "DATABASE_URL",
      "AUTH_SECRET",
    ],
    censor: "[redacted]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;
