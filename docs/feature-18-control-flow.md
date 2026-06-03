# Feature 18: Loop & Conditional Handling

> **Superseded by the AST (feature 19).** The regex-based `stripControlFlow`
> heuristic described here has been removed. tree-sitter extracts the body
> commands of `for`/`while`/`until`/`if`/`case` natively (a loop body is just a
> `command` node in the parse), so the outcomes below now hold without the
> heuristic. The discourage-chaining exemption for control flow is preserved via
> the parser's `hadControlFlow` flag. This doc is kept for history.

## Summary

Recognise shell control-flow constructs (`for`, `while`, `until`, `if`, `case`) and evaluate the **body** commands against the normal rule set, rather than letting the scaffolding confuse the command splitter.

## The problem

The compound splitter (`feature-08`) breaks on `;`, so a loop like

```
for f in *.txt; do rm -rf /data/$f; done
```

was split into the fragments `["for f in *.txt", "do rm -rf /data/$f", "done"]`. Two bad outcomes:

1. **Benign loops were denied.** A loop's `;` separators looked like command chaining, so `discourageChaining` (`feature-17`) converted the defaulted `ask` into a deny with misleading "run these separately" guidance — which makes no sense for a loop body.
2. **Prefix rules were blind inside bodies.** The `do ` prefix meant the real body command (`rm -rf …`) never matched a prefix `deny`/`ask`/`allow` rule. Only regex `checks` (which substring-match) caught dangerous bodies.

## How it works

`src/bash/control-flow.ts` runs **before** splitting:

1. `looksLikeControlFlow` detects a genuine construct via structural markers — `do`+`done`, `then`+`fi`, `for X in`, or `case`+`esac` — so a keyword used as an argument (`echo for loop`) is not misread.
2. `stripControlFlow` normalises newlines to `;`, removes the headers (`for/while/until … do`, `if/elif … then`, `case … in`), the closing keywords (`done`/`fi`/`esac`, plus any trailing redirection like `done < file`), and the bare `do`/`then`/`else` tokens.
3. The remaining body command(s) flow into the normal pipeline (split → normalise → evaluate).

```
for f in *.txt; do rm -rf /data/$f; done  ->  rm -rf /data/$f   -> deny (rm rule + checks)
for f in a b; do echo $f; done            ->  echo $f           -> allow
if [ -f x ]; then cat x; else echo no; fi ->  cat x; echo no
```

## Decision semantics

The body is what the permission decision is based on: if any body command is denied, the loop is denied; if all are allowed, the loop is allowed. The original command is what runs — fencepost does not rewrite it (no `updatedInput`); it only decides allow/ask/deny.

When a control-flow construct is detected, the **chaining nudge is skipped** (`wasControlFlow` short-circuits `discourageChaining`), because a loop is a single unit the user authored — telling Claude to "run the steps separately" would be wrong.

## Limitations

This is a heuristic, not a shell parser (consistent with the project's treatment of subshells in `feature-08`):

- Very unusual layouts, `case` pattern bodies, and control keywords embedded in quoted strings may be stripped imperfectly. The failure mode is conservative-ish: leftover fragments evaluate as ordinary commands, and regex `checks` still substring-match the original-style content.
- See "Future work" in `feature-08` / project notes on a possible AST-based bash analyser for full robustness.
