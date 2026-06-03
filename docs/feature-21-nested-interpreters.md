# Feature 21: Nested Interpreter Analysis (inline Python/JS)

Status: **implemented**. Inline interpreter code is analysed in `src/bash/ast-interp.ts` and folded into the command's decision by `src/bash/evaluate-ast.ts`. Configured via `tools.bash.interpreters`; the bundled `python-safety` preset ships conservative defaults for Python and JS.

## Motivation

Claude frequently runs inline code through an interpreter: `python3 -c "…"`, `node -e "…"`, `bun -e "…"`, or a heredoc (`python <<'PY' … PY`). To the shell parser this is just a `command` (`python3`) with an **opaque string argument** — so the bash rules see the interpreter but not what the code does. A snippet like

```bash
python3 -c "import shutil; shutil.rmtree('/data')"
```

passes every bash rule (it's just `python3` with a string), yet deletes a tree. This feature parses the **inline code** with a second tree-sitter grammar and runs rules over its calls and imports.

> Validated by spike: tree-sitter-python extracts the qualified callee (`shutil.rmtree`), string args (`'/data'`), `open(path, 'w')` writes, `subprocess.run([...])`, and dynamic markers (`exec`, `__import__`). Grammar load ≈ 55 ms, lazy-loaded only when inline code is detected.

## Scope & limits (read first)

- **Inline only.** `-c` / `-e` / `-r` flags and heredocs are analysed. `python script.py` runs a file we do not read (it may not exist yet or may change before execution) — out of scope.
- **Surface-level names.** `import shutil as sh; sh.rmtree(...)` yields callee `sh.rmtree`, which won't match `shutil.rmtree` in v1. Simple alias resolution from the import statements is a later enhancement.
- **Dynamic code is opaque**, same ceiling as bash: `getattr(os, 'remove')`, `exec(b64decode(...))` are caught only as the markers `getattr`/`exec`, not by their effect. This stays an accidental-damage guard, not a sandbox.
- **Per-language cost.** Each language is a separate grammar (+~55 ms when triggered) and rule set. Python and JS (node/bun/deno) first; ruby/perl/php later if warranted.

## Detection (bash layer)

During extraction (`feature-20`), a command is an *interpreter invocation with inline code* when:

- its `name` is in a configured interpreter's `names`, **and**
- it carries inline code via: a code flag (`python -c <str>`, `node -e <str>`, `perl -e`, `ruby -e`, `php -r`), **or** a heredoc body (`python <<'PY' … PY`, including `python - <<EOF`).

The code string is the **content** of the string/heredoc node (unquoted, unescaped) — tree-sitter-bash exposes `string_content` / `raw_string` / `heredoc_body`, so we take their text rather than slicing quotes ourselves.

Language routing: `python`/`python3` → tree-sitter-python; `node`/`bun`/`deno` → tree-sitter-javascript. Grammars are lazy-loaded per language, only when triggered.

## Analysis (nested parse)

Parse the extracted code with the language grammar and collect:

- **Calls** — qualified callee text (`shutil.rmtree`, `os.remove`, `open`, `subprocess.run`, `eval`, `exec`, `__import__`) plus the argument node texts, and any **string-literal path args** (resolved against `cwd`, reusing `feature-20`'s `path-match`).
- **Imports** — `import os`, `from shutil import rmtree`, etc.

## Schema

A new `interpreters` map under `tools.bash`, keyed by language:

```yaml
tools:
  bash:
    interpreters:
      python:
        names: ["python", "python3"]   # bash command names (default shown)
        calls:
          # Destructive recursive delete -> deny, unless confined to the sandbox.
          - match: "shutil.rmtree"
            pathArgsOutside: ["/tmp/claude", "."]
            decision: deny
            description: "Recursive tree delete outside the sandbox."
            alternative: "Operate under /tmp/claude/, or delete specific files."
          # File removal -> ask outside the sandbox.
          - match: "os.remove|os.unlink"      # callee glob (| = alternation)
            pathArgsOutside: ["/tmp/claude", "."]
            decision: ask
          # Spawning processes -> ask (the bash rules can't see the spawned argv).
          - match: "subprocess.*"
            decision: ask
            description: "Inline Python is spawning a subprocess."
          # Dynamic execution -> ask (hard to review).
          - match: "eval|exec|compile|__import__|getattr"
            decision: ask
            description: "Dynamic code execution / reflection."
        writes:                               # open(path, 'w'|'a'|'x'|...)
          outside: ["/tmp/claude", "."]
          decision: deny
          description: "Writing a file outside the sandbox."
        imports:
          - match: "ctypes|cffi"
            decision: ask
            description: "Loading native code."

      javascript:
        names: ["node", "bun", "deno"]
        calls:
          - match: "fs.rmSync|fs.rm|fs.unlinkSync|fs.rmdirSync"
            pathArgsOutside: ["/tmp/claude", "."]
            decision: deny
            description: "Filesystem delete outside the sandbox."
          - match: "child_process.*|Bun.spawn*"
            decision: ask
        writes:
          outside: ["/tmp/claude", "."]
          decision: deny
```

### Rule shapes

```typescript
interface CallRule {
  match: string;             // qualified callee; * within a name, | alternation
  argMatches?: string;       // optional: any arg text matches this regex
  pathArgsOutside?: string[];// fire only if a string path arg is outside all roots
  decision: Decision;
  description?: string;       // required for deny/ask
  alternative?: string;
}

interface WriteRule {        // open()/fs write helpers with a write mode
  outside: string[];         // path roots
  decision: Decision;
  description?: string;
  alternative?: string;
}

interface ImportRule {
  match: string;             // module name; * / | supported
  decision: Decision;
  description?: string;
}

interface InterpreterConfig {
  names: string[];
  calls?: CallRule[];
  writes?: WriteRule;
  imports?: ImportRule[];
}

interface BashConfig {
  /* …existing… */
  interpreters?: Record<string, InterpreterConfig>;  // ast only; "python" | "javascript"
}
```

`writes` is sugar for the common "file opened for writing" case: `open(p, 'w'|'a'|'x'|'+')` in Python, `fs.writeFileSync`/`fs.createWriteStream`/`fs.appendFileSync` in JS. It evaluates the path arg with `outside` semantics. (Equivalent to a `calls` rule with `argMatches` for the mode + `pathArgsOutside`, but cleaner.)

## Precedence

A nested analysis produces zero or more decisions (one per matching call/import/write rule). They fold into the **host command's** decision and then into the usual tiers (`feature-20`):

- Each nested rule contributes by its `decision`, bucketed into the same deny / smart-allow / ask tiers as the command's own rules.
- The interpreter command's final decision is the most restrictive of: its bash command/argument/redirect rules **and** its nested-code rules.
- Deny still beats smart-allow: a `shutil.rmtree` deny cannot be overridden by an allow elsewhere.

So `python3 -c "import shutil; shutil.rmtree('/etc')"` → nested deny → command deny; `… shutil.rmtree('/tmp/claude/x')` → `pathArgsOutside` not satisfied → no deny → falls through to the command's base decision (e.g. allow `python` if configured, else default).

## Performance

- The interpreter grammar (python ≈55 ms / js similar) loads **only** when an inline-code interpreter call is detected, on top of the bash AST (~75 ms). So a `python -c …` call is roughly `baseline + 75 + 55 ms`; a plain `ls` pays neither.
- Grammars are cached per process (one load per language per invocation). As with the bash spike, hooks spawn fresh, so it's paid per triggering call.

## Rollout

- Lands with the rest of the AST work, under `parser: ast`, default off.
- Ship conservative defaults in a preset (e.g. `python-safety`): ask on `subprocess`/`eval`/`exec`, deny destructive deletes/writes outside the sandbox.
- Document the inline-only and alias-resolution limits prominently so it isn't mistaken for sandboxing.
