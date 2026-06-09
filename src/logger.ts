// Minimal structured logger. Writes JSON lines to stderr (stdout is reserved
// for hook output). Silent by default; set LOG_LEVEL to enable. Kept tiny and
// dependency-free so the shipped bundle stays small and bundles cleanly for
// Node (pino's worker/transport machinery does not).

type Level = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const ORDER: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100,
};

const threshold = ORDER[process.env["LOG_LEVEL"] ?? "silent"] ?? 100;

function emit(level: Level, a: unknown, b?: unknown): void {
  if ((ORDER[level] ?? 0) < threshold) return;

  let fields: Record<string, unknown> = {};
  let msg: string | undefined;
  if (typeof a === "string") {
    msg = a;
  } else if (a && typeof a === "object") {
    fields = a as Record<string, unknown>;
    if (typeof b === "string") msg = b;
  }

  const rec: Record<string, unknown> = { level, time: Date.now(), ...fields };
  if (rec["err"] instanceof Error) {
    const e = rec["err"] as Error;
    rec["err"] = { name: e.name, message: e.message, stack: e.stack };
  }
  if (msg !== undefined) rec["msg"] = msg;

  process.stderr.write(JSON.stringify(rec) + "\n");
}

export const logger = {
  trace: (a: unknown, b?: unknown) => emit("trace", a, b),
  debug: (a: unknown, b?: unknown) => emit("debug", a, b),
  info: (a: unknown, b?: unknown) => emit("info", a, b),
  warn: (a: unknown, b?: unknown) => emit("warn", a, b),
  error: (a: unknown, b?: unknown) => emit("error", a, b),
  fatal: (a: unknown, b?: unknown) => emit("fatal", a, b),
};
