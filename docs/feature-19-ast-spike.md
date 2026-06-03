# Feature 19: AST-based Bash Analysis (Spike)

Status: **implemented / promoted**. Bash is now always evaluated through the AST; the string pipeline (`split.ts`, `control-flow.ts`) and the `tools.bash.parser` flag have been removed. Parse failure fails open (allow). See `feature-20` (structured rules) and `feature-21` (nested interpreters) for what the parse unlocked.

> The notes below are the original spike write-up, retained for the cold-start numbers and rationale.

## Goal

Evaluate replacing the string-level Bash pipeline (hand-rolled splitter + control-flow heuristics + opaque subshells) with a real parse via tree-sitter, to (a) remove custom string-wrangling and (b) unlock rule classes the string model can't express (redirections, all-argument awareness).

## What was built

- `src/bash/ast.ts` — lazy-initialised tree-sitter parser (`web-tree-sitter` + the prebuilt `tree-sitter-bash` grammar). The two wasm blobs are **embedded** into the compiled binary via `import … with { type: "file" }` and loaded as bytes (`Parser.init({ wasmBinary })`, `Language.load(bytes)`), so no external files are needed at runtime. `extractBash()` walks the tree and returns the flat list of simple commands, their redirections, and `hadControlFlow`/`hadSequencing` flags. Fail-open: any error returns `ok: false`.
- `src/bash/evaluate-ast.ts` — feeds the extracted commands into the shared `evaluateBashParts()` matcher, plus a redirection-aware rule (`denyWritesOutsideSandbox`).
- `src/evaluate.ts` — refactored so the per-command matching core (`evaluateBashParts`) is shared by both the string and AST paths.
- `src/index.ts` — when `parser: ast`, routes Bash through the AST path and **falls back to the string pipeline** if extraction fails. The `web-tree-sitter` import is dynamic, so the string path pays nothing.
- Config: `tools.bash.parser` (`ast`|`string`, default `string`) and `tools.bash.denyWritesOutsideSandbox` (default `false`).

## Robustness gains (demonstrated)

| Command | String path | AST path |
|---------|-------------|----------|
| `for f in *.txt; do rm -rf /data/$f; done` | heuristic strip | body `rm -rf /data/$f` extracted natively |
| `echo hi > /etc/passwd` | allowed (matches `echo`; redirect invisible) | **denied** — write outside sandbox |
| `x=$(rm -rf /data); echo $x` | subshell opaque; `rm` missed | `rm -rf /data` surfaced and evaluated |
| `ls && rm -rf /tmp/x \| grep foo` | custom splitter | three commands extracted from the parse |

The redirection rule (`denyWritesOutsideSandbox`) is the headline: it is simply **not expressible** in the prefix/regex string model, because the model never sees the redirect as structured data.

## Cost (compiled binary, this machine)

Full per-invocation wall time (process spawn + runtime boot + config + evaluate), avg of 8 fresh runs:

| Parser | avg |
|--------|-----|
| `string` | ~140 ms |
| `ast` | ~215 ms |

So the AST adds **~75 ms** (tree-sitter init ~65ms + grammar load ~70ms in dev, ~75ms combined here + parse <10ms) on top of the ~140 ms baseline. The ~140 ms baseline is the `bun build --compile` single-file executable boot, independent of this work. Binary size is unchanged at ~102 MB (the wasm is ~1.6 MB).

Because hooks spawn a fresh process per tool call, the init cost is paid every call — it cannot be amortised by a warm process.

## Assessment & recommendation

- **Feasible and correct-er.** Embedding works, fallback works, and it closes real holes (redirections, subshells, loops) with less bespoke code.
- **Cost is ~75 ms/call.** Within the 5 s hook budget and likely imperceptible relative to model latency, but not free.
- **Recommendation:** keep it behind the flag for now; do not flip the default yet. Next steps before promoting:
  1. Decide if ~75 ms/call is acceptable as a default (it likely is for most users).
  2. Build out redirection/all-argument rules properly (this spike only ships one demo rule) and migrate the string-only presets to take advantage.
  3. Verify the grammar/runtime version pin (`web-tree-sitter@0.22.6` + `tree-sitter-wasms@0.1.13`) and add a CI check that the wasm loads in the compiled binary.
  4. Keep the string path as the guaranteed fallback.
- **Scope honesty:** the AST improves robustness against *legible* commands. It does not defeat deliberate obfuscation (`eval`, `base64 -d | sh`, variable indirection). Fencepost targets a cooperative assistant's accidental damage, not adversarial evasion — document this so the AST isn't mistaken for a sandbox.
