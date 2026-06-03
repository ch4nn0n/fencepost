// Nested interpreter analysis (feature 21): parse inline code carried by an
// interpreter command (python -c "...", node -e "...", heredocs) with a second
// tree-sitter grammar and evaluate rules over its calls / writes / imports.

import { loadGrammar } from "./ast.js";
import { nameMatches } from "./rules.js";
import { isOutsideAllRoots } from "../util/path-match.js";
import { logger } from "../logger.js";
import type { EvalResult, FencepostConfig, InterpreterConfig } from "../types.js";
import type { ExtractedCommand } from "./ast.js";

import pythonWasmPath from "../../node_modules/tree-sitter-wasms/out/tree-sitter-python.wasm" with { type: "file" };
import javascriptWasmPath from "../../node_modules/tree-sitter-wasms/out/tree-sitter-javascript.wasm" with { type: "file" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TsNode = any;

interface LangSpec {
  wasm: string;
  callNode: string;
  writeCallees: Record<string, number>; // callee -> path arg index, for write detection
}

const LANGS: Record<string, LangSpec> = {
  python: {
    wasm: pythonWasmPath,
    callNode: "call",
    writeCallees: {}, // python writes handled specially (open + mode)
  },
  javascript: {
    wasm: javascriptWasmPath,
    callNode: "call_expression",
    writeCallees: {
      "fs.writeFileSync": 0,
      "fs.writeFile": 0,
      "fs.appendFileSync": 0,
      "fs.appendFile": 0,
      "fs.createWriteStream": 0,
      "Bun.write": 0,
    },
  },
};

const CODE_FLAGS = new Set(["-c", "-e", "-r"]);

/** Find the interpreter language whose names include this command. */
function langForCommand(name: string | null, config: FencepostConfig): { lang: string; cfg: InterpreterConfig } | null {
  const interpreters = config.tools.bash.interpreters;
  if (!name || !interpreters) return null;
  for (const [lang, cfg] of Object.entries(interpreters)) {
    if (cfg.names?.includes(name)) return { lang, cfg };
  }
  return null;
}

/** Pull the inline code from a command's args (-c/-e/-r) or heredoc body. */
function inlineCodeOf(cmd: ExtractedCommand): string | null {
  for (let i = 0; i < cmd.args.length - 1; i++) {
    if (CODE_FLAGS.has(cmd.args[i]!)) return cmd.args[i + 1]!;
  }
  return cmd.heredoc;
}

function unquote(text: string): string {
  const m = text.match(/^[A-Za-z]*(['"`])([\s\S]*)\1$/);
  return m ? m[2]! : text;
}

interface CallInfo {
  callee: string;
  argTexts: string[];
  stringArgs: string[]; // unquoted string-literal args
}

/** Walk an interpreter parse tree collecting calls, writes, and imports. */
function collect(root: TsNode, spec: LangSpec, isPython: boolean) {
  const calls: CallInfo[] = [];
  const writes: string[] = [];
  const imports: string[] = [];

  const walk = (n: TsNode): void => {
    if (n.type === spec.callNode) {
      const fn = n.childForFieldName("function");
      const callee = fn ? fn.text : "";
      const argsNode = n.childForFieldName("arguments");
      const argTexts: string[] = [];
      const stringArgs: string[] = [];
      if (argsNode) {
        for (let i = 0; i < argsNode.namedChildCount; i++) {
          const a = argsNode.namedChild(i);
          argTexts.push(a.text);
          if (a.type === "string") stringArgs.push(unquote(a.text));
        }
      }
      calls.push({ callee, argTexts, stringArgs });

      // Write detection.
      if (isPython && callee === "open" && argTexts[1] && /['"][^'"]*[wax+]/.test(argTexts[1]) && stringArgs[0]) {
        writes.push(stringArgs[0]);
      } else if (!isPython && callee in spec.writeCallees) {
        const idx = spec.writeCallees[callee]!;
        const target = stringArgs[idx === 0 ? 0 : idx];
        if (target) writes.push(target);
      }
    }
    if (n.type === "import_statement" || n.type === "import_from_statement") {
      const m = n.text.match(/(?:from\s+([\w.]+)|import\s+([\w.]+))/);
      if (m) imports.push((m[1] ?? m[2])!);
    }
    for (let i = 0; i < n.childCount; i++) walk(n.child(i));
  };
  walk(root);
  return { calls, writes, imports };
}

/**
 * Analyse a command's inline interpreter code, returning rule findings as
 * EvalResults. Returns [] when the command is not a configured interpreter,
 * carries no inline code, or parsing fails (fail-open).
 */
export async function analyseInterpreter(
  cmd: ExtractedCommand,
  config: FencepostConfig,
  cwd: string,
): Promise<EvalResult[]> {
  const match = langForCommand(cmd.name, config);
  if (!match) return [];
  const code = inlineCodeOf(cmd);
  if (!code) return [];
  const spec = LANGS[match.lang];
  if (!spec) return [];

  try {
    const parser = await loadGrammar(spec.wasm);
    const tree = parser.parse(code);
    const { calls, writes, imports } = collect(tree.rootNode, spec, match.lang === "python");

    const findings: EvalResult[] = [];
    const cfg = match.cfg;

    for (const rule of cfg.calls ?? []) {
      for (const call of calls) {
        if (!nameMatches(call.callee, rule.match)) continue;
        if (rule.argMatches) {
          try {
            const re = new RegExp(rule.argMatches);
            if (!call.argTexts.some((a) => re.test(a))) continue;
          } catch {
            continue;
          }
        }
        if (rule.pathArgsOutside) {
          const outside = call.stringArgs.some((p) => isOutsideAllRoots(p, rule.pathArgsOutside!, cwd));
          if (!outside) continue;
        }
        findings.push({
          decision: rule.decision,
          reason: rule.description ?? `inline ${match.lang}: ${call.callee}`,
          ...(rule.alternative ? { alternative: rule.alternative } : {}),
          matchedRule: `${match.lang}.calls: ${rule.match}`,
          matchedInput: cmd.text,
        });
        break; // one finding per rule is enough
      }
    }

    if (cfg.writes) {
      for (const target of writes) {
        if (isOutsideAllRoots(target, cfg.writes.outside, cwd)) {
          findings.push({
            decision: cfg.writes.decision,
            reason: cfg.writes.description ?? `inline ${match.lang}: writes ${target}`,
            ...(cfg.writes.alternative ? { alternative: cfg.writes.alternative } : {}),
            matchedRule: `${match.lang}.writes`,
            matchedInput: cmd.text,
          });
          break;
        }
      }
    }

    for (const rule of cfg.imports ?? []) {
      if (imports.some((mod) => nameMatches(mod, rule.match))) {
        findings.push({
          decision: rule.decision,
          reason: rule.description ?? `inline ${match.lang}: imports ${rule.match}`,
          matchedRule: `${match.lang}.imports: ${rule.match}`,
          matchedInput: cmd.text,
        });
      }
    }

    return findings;
  } catch (err) {
    logger.warn({ err, lang: match.lang }, "interpreter analysis failed, skipping");
    return [];
  }
}
