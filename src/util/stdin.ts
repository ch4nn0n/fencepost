import type { HookInput } from "../types.js";

/** Read all of stdin and parse as JSON. Returns null on empty or parse failure. */
export async function readStdin(): Promise<HookInput | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HookInput;
  } catch {
    return null;
  }
}
