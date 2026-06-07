---
title: Nested interpreters
description: Analyse inline Python and JavaScript run through python -c, node -e, or heredocs.
---

# Nested interpreters

Claude frequently runs inline code through an interpreter:

```bash
python3 -c "import shutil; shutil.rmtree('/data')"
node -e "fs.rmSync('/srv', { recursive: true })"
python <<'PY'
import os; os.remove('/etc/hosts')
PY
```

To the shell parser, that first line is just the command `python3` with an **opaque string argument**. Every bash rule sees `python3` and a string — not the `rmtree` inside. So a snippet like the one above sails past prefix and argument rules, yet deletes a tree.

The `interpreters` config closes that gap: fencepost parses the **inline code** with a second tree-sitter grammar and runs rules over its calls, imports, and writes.

## Scope & limits

Read these first — they define what this feature is and isn't:

- **Inline only.** `-c` / `-e` / `-r` flags and heredocs are analysed. `python script.py` runs a file fencepost does not read (it may not exist yet, or change before execution) — out of scope.
- **Surface-level names.** `import shutil as sh; sh.rmtree(...)` yields callee `sh.rmtree`, which won't match `shutil.rmtree`. Alias resolution is a future enhancement.
- **Dynamic code is opaque.** `getattr(os, 'remove')`, `exec(b64decode(...))` are caught only as the markers `getattr`/`exec`, not by their effect — the same ceiling as bash. This is an accidental-damage guard, **not** a sandbox.

## How detection works

During [AST extraction](./structured-bash-rules.md), a command is treated as an *interpreter invocation with inline code* when its name is in a configured interpreter's `names` **and** it carries inline code via a code flag (`-c`/`-e`/`-r`) or a heredoc body. The code string is the literal content of the string/heredoc node — fencepost takes tree-sitter's `string_content`/`raw_string`/`heredoc_body` rather than slicing quotes itself.

Language routing: `python`/`python3` → tree-sitter-python; `node`/`bun`/`deno` → tree-sitter-javascript. Grammars are **lazy-loaded** per language, only when triggered, so a plain `ls` pays nothing.

## Schema

An `interpreters` map under `tools.bash`, keyed by language:

```yaml
tools:
  bash:
    interpreters:
      python:
        names: ["python", "python3"]
        calls:
          # Destructive recursive delete → deny, unless confined to the sandbox.
          - match: "shutil.rmtree"
            pathArgsOutside: ["/tmp/claude", "."]
            decision: deny
            description: "Recursive tree delete outside the sandbox."
            alternative: "Operate under /tmp/claude/, or delete specific files."
          # File removal → ask outside the sandbox.
          - match: "os.remove|os.unlink"     # callee glob (| = alternation)
            pathArgsOutside: ["/tmp/claude", "."]
            decision: ask
          # Spawning processes → ask (bash can't see the spawned argv).
          - match: "subprocess.*"
            decision: ask
            description: "Inline Python is spawning a subprocess."
          # Dynamic execution → ask (hard to review).
          - match: "eval|exec|compile|__import__|getattr"
            decision: ask
            description: "Dynamic code execution / reflection."
        writes:                               # open(path, 'w'|'a'|'x'|…)
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

| Rule | Fields |
|------|--------|
| **`calls[]`** | `match` (qualified callee; `*` within a name, `|` alternation), optional `argMatches` (regex over arg text), optional `pathArgsOutside` (fire only if a string path arg is outside all roots), `decision`, `description`, `alternative` |
| **`writes`** | `outside` (roots), `decision`, `description`, `alternative` — sugar for "a file opened for writing" (`open(p,'w'\|'a'\|'x'\|'+')` in Python; `fs.writeFileSync`/`createWriteStream`/`appendFileSync` in JS) |
| **`imports[]`** | `match` (module name; `*`/`|`), `decision`, `description` |

## Precedence

A nested analysis produces zero or more decisions — one per matching call/import/write. They fold into the **host command's** decision: bucketed into the same deny / scoped-allow / ask tiers, and the command's final decision is the **most restrictive** of its own bash rules and its nested-code rules.

Deny still beats a scoped allow:

```bash
python3 -c "import shutil; shutil.rmtree('/etc')"
# → shutil.rmtree, path outside roots → nested deny → command deny

python3 -c "import shutil; shutil.rmtree('/tmp/claude/x')"
# → pathArgsOutside not satisfied → no deny → falls through to the command's base decision
```

## Defaults via preset

The bundled [`python-safety` preset](../presets.md) ships conservative defaults for both languages: **ask** on `subprocess`/`eval`/`exec`/`child_process`, **deny** destructive deletes and writes outside the sandbox. Import it rather than writing the rules by hand:

```yaml
import:
  - python-safety
```

## Performance

The interpreter grammar (~55 ms for Python; similar for JS) loads **only** when an inline-code interpreter call is detected, on top of the bash AST (~75 ms). So a `python -c …` call costs roughly `baseline + 75 + 55 ms`; a plain `ls` pays neither. Grammars are cached per process.
