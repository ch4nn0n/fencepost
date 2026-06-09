// AST-based bash extraction via tree-sitter (features 19/20).
//
// Bash is always evaluated through this parse. extractBash() returns the flat
// list of simple commands actually executed (including inside loops,
// conditionals, pipelines, and command substitutions), each with its name,
// (unquoted) arguments, attached redirections, and heredoc body. Fail-open: any
// error returns ok:false and the caller fails open.

import { logger } from "../logger.js";
import { readWasm } from "../wasm.js";

// Tree-sitter grammars are loaded from wasm at runtime. We read the bytes
// ourselves (see ../wasm.ts) and hand them to the parser, avoiding Emscripten's
// file-location logic entirely so the same code runs under Node and Bun.
const BASH_WASM = "tree-sitter-bash.wasm";

export interface Redirect {
  op: string; // ">", ">>", "<", "&>", ">|" ...
  mode: "read" | "write" | "append";
  target: string | null;
}

export interface ExtractedCommand {
  text: string; // full simple-command text (raw, with quotes)
  name: string | null; // "rm", "git", "python3" ...
  args: string[]; // arguments without the name; string literals unquoted
  redirects: Redirect[];
  heredoc: string | null; // heredoc body bound to this command, if any
}

export interface ExtractResult {
  ok: boolean;
  commands: ExtractedCommand[];
  looseRedirects: Redirect[];
  hadControlFlow: boolean;
  hadSequencing: boolean; // joined by && / || / ; (not just a pipe)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TsParser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TsNode = any;

let runtimeInit: Promise<TsParser> | null = null;

/** Initialise the tree-sitter runtime once and return the Parser class. */
async function getRuntime(): Promise<TsParser> {
  if (!runtimeInit) {
    runtimeInit = (async () => {
      const Parser = (await import("web-tree-sitter")).default;
      const bytes = await readWasm("tree-sitter.wasm");
      await Parser.init({ wasmBinary: bytes });
      return Parser;
    })();
  }
  return runtimeInit;
}

const grammarCache = new Map<string, Promise<TsParser>>();

/**
 * Load a parser for a grammar wasm file (by basename), cached per process. Used
 * for bash here and for nested interpreter grammars (feature 21).
 */
export async function loadGrammar(wasmFile: string): Promise<TsParser> {
  let cached = grammarCache.get(wasmFile);
  if (!cached) {
    cached = (async () => {
      const Parser = await getRuntime();
      const bytes = await readWasm(wasmFile);
      const lang = await Parser.Language.load(bytes);
      const parser = new Parser();
      parser.setLanguage(lang);
      return parser;
    })();
    grammarCache.set(wasmFile, cached);
  }
  return cached;
}

const WRITE_OPS = new Set([">", ">|", "&>"]);
const APPEND_OPS = new Set([">>", "&>>"]);

function redirectMode(op: string): Redirect["mode"] {
  if (APPEND_OPS.has(op)) return "append";
  if (WRITE_OPS.has(op)) return "write";
  return "read";
}

/** Unquoted text of an argument node (string/raw_string -> content). */
function argText(node: TsNode): string {
  if (node.type === "string") {
    let s = "";
    for (let i = 0; i < node.namedChildCount; i++) {
      const c = node.namedChild(i);
      if (c.type === "string_content") s += c.text;
    }
    // Fall back to stripping the delimiters if there was no string_content.
    return s || node.text.replace(/^"|"$/g, "");
  }
  if (node.type === "raw_string") return node.text.replace(/^'|'$/g, "");
  return node.text;
}

function buildCommand(node: TsNode): ExtractedCommand {
  const nameNode = node.childForFieldName("name");
  const args: string[] = [];
  for (let i = 0; i < node.namedChildCount; i++) {
    const c = node.namedChild(i);
    if (nameNode && c.id === nameNode.id) continue;
    if (c.type === "variable_assignment") continue; // env prefix: FOO=bar cmd
    args.push(argText(c));
  }
  return { text: node.text, name: nameNode ? nameNode.text : null, args, redirects: [], heredoc: null };
}

const CONTROL_NODES = new Set([
  "for_statement",
  "c_style_for_statement",
  "while_statement",
  "if_statement",
  "case_statement",
]);

/** Find the ExtractedCommand that owns a redirect, climbing to its statement. */
function ownerOf(redirectNode: TsNode, byId: Map<number, ExtractedCommand>): ExtractedCommand | null {
  let n: TsNode | null = redirectNode.parent;
  while (n) {
    if (n.type === "redirected_statement") {
      const body = n.childForFieldName("body");
      if (body) {
        if (byId.has(body.id)) return byId.get(body.id)!;
        // body may be a pipeline/list: attach to its last command descendant.
        const last = lastCommandIn(body, byId);
        if (last) return last;
      }
      return null;
    }
    n = n.parent;
  }
  return null;
}

function lastCommandIn(node: TsNode, byId: Map<number, ExtractedCommand>): ExtractedCommand | null {
  let found: ExtractedCommand | null = null;
  const walk = (n: TsNode): void => {
    if (n.type === "command" && byId.has(n.id)) found = byId.get(n.id)!;
    for (let i = 0; i < n.childCount; i++) walk(n.child(i));
  };
  walk(node);
  return found;
}

export async function extractBash(command: string): Promise<ExtractResult> {
  const empty: ExtractResult = {
    ok: false,
    commands: [],
    looseRedirects: [],
    hadControlFlow: false,
    hadSequencing: false,
  };
  try {
    const parser = await loadGrammar(BASH_WASM);
    const tree = parser.parse(command);

    const commands: ExtractedCommand[] = [];
    const byId = new Map<number, ExtractedCommand>();
    const looseRedirects: Redirect[] = [];
    let hadControlFlow = false;
    let hadSequencing = false;

    // Pass 1: commands + flags.
    const visit = (n: TsNode): void => {
      if (CONTROL_NODES.has(n.type)) hadControlFlow = true;
      if (n.type === "list") hadSequencing = true; // && / || / ; (pipelines are `pipeline`)
      if (n.type === "command") {
        const ec = buildCommand(n);
        commands.push(ec);
        byId.set(n.id, ec);
      }
      for (let i = 0; i < n.childCount; i++) visit(n.child(i));
    };
    visit(tree.rootNode);

    // Pass 2: redirects + heredocs, attached to their owning command.
    const visitRedir = (n: TsNode): void => {
      if (n.type === "file_redirect" || n.type === "heredoc_redirect") {
        const op = n.child(0)?.text ?? "";
        const dest = n.childForFieldName?.("destination");
        const redirect: Redirect = { op, mode: redirectMode(op), target: dest ? dest.text : null };
        const owner = ownerOf(n, byId);
        if (owner) owner.redirects.push(redirect);
        else looseRedirects.push(redirect);
      }
      if (n.type === "heredoc_body") {
        // Attach to the most recent command that opened a heredoc.
        const owner = nearestHeredocOwner(n, byId);
        if (owner && owner.heredoc === null) owner.heredoc = n.text.replace(/\n?[A-Za-z_][A-Za-z0-9_]*\s*$/, "");
      }
      for (let i = 0; i < n.childCount; i++) visitRedir(n.child(i));
    };
    visitRedir(tree.rootNode);

    return { ok: true, commands, looseRedirects, hadControlFlow, hadSequencing };
  } catch (err) {
    logger.warn({ err }, "ast extraction failed, failing open");
    return empty;
  }
}

/** Best-effort: find the command preceding a heredoc body in the same statement. */
function nearestHeredocOwner(bodyNode: TsNode, byId: Map<number, ExtractedCommand>): ExtractedCommand | null {
  let n: TsNode | null = bodyNode.parent;
  while (n) {
    if (n.type === "redirected_statement") {
      const body = n.childForFieldName("body");
      if (body && byId.has(body.id)) return byId.get(body.id)!;
      if (body) return lastCommandIn(body, byId);
    }
    n = n.parent;
  }
  return null;
}
