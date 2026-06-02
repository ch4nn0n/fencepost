// SPIKE (feature 19): AST-based bash extraction via tree-sitter.
//
// Goal: replace the string-level splitter + control-flow heuristics with a real
// parse, yielding the flat list of simple commands actually executed (including
// inside loops, conditionals, pipelines, and command substitutions) plus their
// redirections. The extracted commands are fed into the existing rule matcher.
//
// Behind the `bash.parser: ast` flag; the string pipeline remains the default.
// Everything here is best-effort and fail-open: any error returns ok:false and
// the caller falls back to the string pipeline.

import { logger } from "../logger.js";

// Embed the wasm so it survives `bun build --compile`. The import yields a path
// (real in dev, embedded in the compiled binary); we read the bytes and hand
// them to the parser, avoiding Emscripten's file-location logic entirely.
import runtimeWasmPath from "../../node_modules/web-tree-sitter/tree-sitter.wasm" with { type: "file" };
import bashWasmPath from "../../node_modules/tree-sitter-wasms/out/tree-sitter-bash.wasm" with { type: "file" };

export interface Redirect {
  op: string; // >, >>, <, &>, >| ...
  target: string | null;
}

export interface ExtractResult {
  ok: boolean;
  commands: string[]; // text of each simple command (no scaffolding)
  redirects: Redirect[];
  hadControlFlow: boolean;
  hadSequencing: boolean; // joined by && / || / ; (not just a pipe)
}

const WRITE_OPS = new Set([">", ">>", "&>", "&>>", ">|"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let parserPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getParser(): Promise<any> {
  if (!parserPromise) {
    parserPromise = (async () => {
      const Parser = (await import("web-tree-sitter")).default;
      const runtimeBytes = new Uint8Array(await Bun.file(runtimeWasmPath).arrayBuffer());
      await Parser.init({ wasmBinary: runtimeBytes });
      const bashBytes = new Uint8Array(await Bun.file(bashWasmPath).arrayBuffer());
      const Bash = await Parser.Language.load(bashBytes);
      const parser = new Parser();
      parser.setLanguage(Bash);
      return parser;
    })();
  }
  return parserPromise;
}

const CONTROL_NODES = new Set([
  "for_statement",
  "c_style_for_statement",
  "while_statement",
  "if_statement",
  "case_statement",
]);

/**
 * Parse a bash command and extract the simple commands + redirections.
 * Fail-open: returns { ok: false, ... } on any error.
 */
export async function extractBash(command: string): Promise<ExtractResult> {
  const empty: ExtractResult = {
    ok: false,
    commands: [],
    redirects: [],
    hadControlFlow: false,
    hadSequencing: false,
  };
  try {
    const parser = await getParser();
    const tree = parser.parse(command);

    const commands: string[] = [];
    const redirects: Redirect[] = [];
    let hadControlFlow = false;
    let hadSequencing = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (node: any): void => {
      const type = node.type as string;
      if (CONTROL_NODES.has(type)) hadControlFlow = true;
      if (type === "list") hadSequencing = true; // && / || / ; (pipelines are `pipeline`)
      if (type === "command") {
        commands.push(node.text);
      }
      if (type === "file_redirect" || type === "heredoc_redirect") {
        const dest = node.childForFieldName?.("destination");
        redirects.push({ op: node.child(0)?.text ?? "", target: dest ? dest.text : null });
      }
      for (let i = 0; i < node.childCount; i++) walk(node.child(i));
    };
    walk(tree.rootNode);

    return { ok: true, commands, redirects, hadControlFlow, hadSequencing };
  } catch (err) {
    logger.warn({ err }, "ast extraction failed, will fall back to string pipeline");
    return empty;
  }
}

/** Is this redirect a write to an absolute path outside the given sandbox dir? */
export function isWriteOutsideSandbox(redirect: Redirect, sandbox: string): boolean {
  if (!WRITE_OPS.has(redirect.op)) return false;
  const target = redirect.target;
  if (!target) return false;
  if (!target.startsWith("/")) return false; // relative target — not our concern here
  if (target === "/dev/null" || target.startsWith("/dev/")) return false;
  const dir = sandbox.replace(/\/+$/, "");
  return !(target === dir || target.startsWith(dir + "/"));
}
