import pino from "pino";

const level = process.env["LOG_LEVEL"] ?? "silent";

// Always log to stderr (fd 2) — stdout is reserved for hook JSON output
export const logger = pino(
  { level },
  pino.destination({ fd: 2 })
);
