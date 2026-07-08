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
  text: string; // full simple-command text, canonicalised (quotes/escapes removed) for matching
  name: string | null; // "rm", "git", "python3" ... (unquoted)
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

/**
 * Canonical (unquoted, unescaped) text of a token node.
 *
 * Security-critical: rules are matched against this, never against the raw
 * `node.text`. Because the shell strips quotes and backslashes before execution,
 * `"git"`, `\git`, `g\it` and `g"i"t` all run `git`; matching the raw text would
 * let any of those slip past a rule that targets `git`. We mirror the shell's own
 * unquoting so the string we check is the string that runs.
 */
export function unquoteText(node: TsNode): string {
  switch (node.type) {
    case "string": {
      let s = "";
      let sawContent = false;
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c.type === "string_content") {
          // Inside double quotes bash keeps escapes literal in the token text;
          // resolve the ones it honours (\" \\ \$ \`) so one layer of nesting
          // unwinds per parse. Other backslashes stay verbatim, as bash leaves them.
          s += c.text.replace(/\\(["`$\\])/g, "$1");
          sawContent = true;
        } else {
          s += unquoteText(c); // nested expansion / substitution
        }
      }
      // Fall back to stripping the delimiters if there was no string_content.
      return sawContent ? s : node.text.replace(/^\$?"|"$/g, "");
    }
    case "raw_string":
      return node.text.replace(/^\$?'|'$/g, "");
    case "ansi_c_string":
      return node.text.replace(/^\$'|'$/g, "");
    case "command_name":
    case "concatenation": {
      // `command_name` wraps the real token(s); concatenation joins adjacent
      // ones (e.g. g"i"t). Recurse into the children either way.
      let s = "";
      for (let i = 0; i < node.namedChildCount; i++) s += unquoteText(node.namedChild(i));
      return s;
    }
    default:
      // Bare word (or anything else): drop shell backslash escapes (\x -> x).
      return node.text.replace(/\\(.)/g, "$1");
  }
}

function buildCommand(node: TsNode): ExtractedCommand {
  const nameNode = node.childForFieldName("name");
  const name = nameNode ? unquoteText(nameNode) : null;
  const args: string[] = [];
  for (let i = 0; i < node.namedChildCount; i++) {
    const c = node.namedChild(i);
    if (nameNode && c.id === nameNode.id) continue;
    if (c.type === "variable_assignment") continue; // env prefix: FOO=bar cmd
    args.push(unquoteText(c));
  }
  // Match against the canonical command (unquoted name + args), never node.text,
  // so quoting/escaping a token cannot evade a prefix, regex, or argument rule.
  const text = [name, ...args].filter((p): p is string => p != null && p !== "").join(" ");
  return { text, name, args, redirects: [], heredoc: null };
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
        // Unquote the target so a quoted absolute path (`> "/etc/passwd"`) cannot
        // be misread as relative-to-cwd and slip past path-containment rules.
        const redirect: Redirect = { op, mode: redirectMode(op), target: dest ? unquoteText(dest) : null };
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
