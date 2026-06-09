// Locate and read the tree-sitter wasm files at runtime.
//
// We deliberately do NOT use Bun's `import x from "f.wasm" with { type: "file" }`
// embedding, so the same code runs under plain Node. The build copies the wasm
// files next to the bundle (dist/); in development they live in node_modules.
// We resolve by basename, trying the shipped location first, then node_modules.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));

function candidates(basename: string): string[] {
  return [
    // Shipped: wasm sits next to the bundle (dist/<basename>).
    join(here, basename),
    // Development: running from src/ (here = src/) or dist/ (here = dist/).
    join(here, "..", "node_modules", "tree-sitter-wasms", "out", basename),
    join(here, "..", "node_modules", "web-tree-sitter", basename),
    join(here, "..", "..", "node_modules", "tree-sitter-wasms", "out", basename),
    join(here, "..", "..", "node_modules", "web-tree-sitter", basename),
  ];
}

/** Read a tree-sitter wasm file by basename (e.g. "tree-sitter-bash.wasm"). */
export async function readWasm(basename: string): Promise<Uint8Array> {
  const tried = candidates(basename);
  for (const path of tried) {
    if (existsSync(path)) return new Uint8Array(await readFile(path));
  }
  throw new Error(`wasm not found: ${basename} (looked in: ${tried.join(", ")})`);
}
