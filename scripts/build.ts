// Build the shipped artifact: a Node-targeted JS bundle in dist/, plus the
// tree-sitter wasm files copied alongside it. The result runs under plain Node
// (no Bun, no compile step) and is committed so the plugin ships ready-to-run.

import { rm, mkdir, copyFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const result = await Bun.build({
  entrypoints: [join(root, "src", "index.ts")],
  outdir: out,
  target: "node",
  format: "esm",
  // Readable on purpose: the bundle is committed and auditable.
  minify: false,
  sourcemap: "none",
});

if (!result.success) {
  console.error("build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Copy the wasm grammars next to the bundle so wasm.ts can find them at runtime.
const wasm: Array<[string, string]> = [
  ["web-tree-sitter", "tree-sitter.wasm"],
  ["tree-sitter-wasms/out", "tree-sitter-bash.wasm"],
  ["tree-sitter-wasms/out", "tree-sitter-python.wasm"],
  ["tree-sitter-wasms/out", "tree-sitter-javascript.wasm"],
];
for (const [pkg, file] of wasm) {
  await copyFile(join(root, "node_modules", pkg, file), join(out, file));
}

console.log(`built ${join(out, "index.js")} + ${wasm.length} wasm files`);
