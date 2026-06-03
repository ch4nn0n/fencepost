# Feature 20: Structured Bash Rules (redirections & arguments)

Status: **implemented**. Bash always runs through the AST (`feature-19`), so these rules are always active. Implemented in `src/bash/ast.ts` (per-command extraction), `src/util/path-match.ts`, `src/bash/rules.ts` (matchers), and `src/bash/evaluate-ast.ts` (tiered evaluation). The `claude` preset uses them in place of the old `allowChecks` regex.

## Motivation

The prefix/regex string model can't reason about two things that matter for safety:

1. **Redirections.** `echo ok > /etc/hosts` matches the `echo` allow; the write is invisible. The spike added one boolean demo rule (`denyWritesOutsideSandbox`); this feature makes redirection a first-class, configurable rule type.
2. **All arguments.** Prefix matching only sees the start of a command, so `rm -rf /tmp/claude/x /etc` slips past a `/tmp/claude` allow. The `allowChecks` `$`-anchored regex was a workaround that only handles a single target. We want to say "every path argument of `rm` must be under an allowed root."

The AST already extracts the pieces we need (command name, args, redirect op + target). This feature defines the rule schema over them.

## Extraction model (changes to `ast.ts`)

Move from a flat command/redirect list to per-command structures, with redirects attached to their command:

```typescript
interface Redirect {
  op: string;              // ">", ">>", "<", "&>", ">|", "<<<", ...
  mode: "read" | "write" | "append"; // derived from op
  target: string | null;  // literal target text, e.g. "/etc/hosts"
}

interface ExtractedCommand {
  text: string;            // full simple-command text
  name: string | null;     // "rm", "git", ...
  args: string[];          // arguments WITHOUT the command name: ["-rf", "/x"]
  redirects: Redirect[];   // redirects bound to this command
}

interface ExtractResult {
  ok: boolean;
  commands: ExtractedCommand[];
  looseRedirects: Redirect[];   // redirects on a compound/subshell, no single owner
  hadControlFlow: boolean;
  hadSequencing: boolean;
}
```

`mode` mapping: `>`, `>|`, `&>` → write; `>>`, `&>>` → append; `<`, `<<`, `<<<` → read. (`append` is a subtype of write for matching; see `mode: write` below.)

## Path semantics (`src/util/path-match.ts`, new)

Redirection targets and command arguments are paths. A small, well-tested helper — not the name-glob in `util/glob.ts`:

```typescript
// Resolve a target against cwd (so relative and ".." paths are normalised),
// then test containment / globbing.
isUnderRoot(target: string, root: string, cwd: string): boolean
isOutsideAllRoots(target: string, roots: string[], cwd: string): boolean
matchesPathGlob(target: string, glob: string, cwd: string): boolean   // supports ** and *
```

Rules:
- Roots and targets are resolved against `cwd` (from the hook input). `.` means the project cwd; `~` expands to home. So `> ../../etc/x` is caught as outside.
- `isUnderRoot`: normalised `target === root` or starts with `root + "/"`.
- `**` matches across path separators, `*` within a segment (path glob, unlike the name glob).
- An argument is **path-like** if it is not a bare flag. `-rf` / `--recursive` are skipped; `--output=/etc/x` is split on `=` and the value (`/etc/x`) is tested; everything else is treated as a candidate path.

## Schema

Two new optional lists under `tools.bash`. Both are ignored unless `parser: ast`.

### `redirects`

Each rule matches a single redirect by mode + target, and carries a decision.

```yaml
tools:
  bash:
    redirects:
      # Deny writes/appends to absolute paths outside the sandbox & project.
      - mode: write                       # read | write | append | any
        outside: ["/tmp/claude", "."]     # fires if target is outside ALL roots
        decision: deny
        description: "Redirecting output outside the sandbox can clobber files."
        alternative: "Write under /tmp/claude/ or a path inside the project."

      # Always ask before touching anything under /etc.
      - mode: any
        glob: "/etc/**"                   # fires if target matches this path glob
        decision: ask
        description: "This writes/reads under /etc."
```

A rule provides **exactly one** target matcher: `outside: [roots]` or `glob: "<pathglob>"`. `mode: append` matches only `>>`/`&>>`; `mode: write` matches all writes including append; `read` matches input redirects; `any` matches all.

### `arguments`

Each rule matches a command by name and applies a predicate over its arguments.

```yaml
tools:
  bash:
    arguments:
      # Allow rm when EVERY path arg is inside the sandbox (multi-target safe).
      - command: rm
        allArgsInside: ["/tmp/claude"]
        decision: allow

      # Deny rm if ANY path arg escapes the sandbox/project.
      - command: rm
        anyArgOutside: ["/tmp/claude", "."]
        decision: deny
        description: "rm targeting paths outside the sandbox is blocked."
        alternative: "Delete within /tmp/claude/ or the project tree."

      # Deny the catastrophic flag regardless of target.
      - command: rm
        anyArgMatches: '^--no-preserve-root$'
        decision: deny
        description: "--no-preserve-root removes the / guard."
```

`command` is a name glob (`rm`, `git`, `*`). A rule provides **exactly one** predicate:

| Predicate | Fires when |
|-----------|-----------|
| `anyArgOutside: [roots]` | any path-like arg resolves outside all roots |
| `allArgsInside: [roots]` | there is ≥1 path-like arg and every one is under some root |
| `anyArgMatches: <regex>` | any raw arg matches the regex |
| `allArgsMatch: <regex>` | every raw arg matches the regex |

## Precedence

New rules slot into the existing tiered model (`feature-05`), bucketed by their `decision`. The AST per-command evaluation becomes:

```
for tier in [deny, allow, ask]:        # "allow" here = smart-allow exceptions
    if any rule of that tier matches this command:
        return that decision (+ its description/alternative)
return default
```

| Tier | Sources (first match wins) |
|------|----------------------------|
| 1 deny | `bash.deny` (prefix), `bash.checks` (regex), `arguments`(deny), `redirects`(deny) |
| 2 smart-allow | `bash.allowChecks` (regex), `arguments`(allow), `redirects`(allow) |
| 3 ask | `bash.ask` (prefix), `arguments`(ask), `redirects`(ask) |
| 4 allow | `bash.allow` (prefix) |
| 5 default | `config.default` |

Key property: **deny always beats a smart-allow** (tier 1 before tier 2), so you cannot "allow" your way past a deny — but a smart-allow (e.g. `allArgsInside` sandbox) beats a broad `ask`. Across the simple commands of a compound, the most-restrictive decision wins, unchanged.

`looseRedirects` (redirects not bound to a single command, e.g. on a subshell) are evaluated against `redirects` rules independently and folded into the most-restrictive result.

## What it replaces

- The `claude` preset's `allowChecks` sandbox regex →
  ```yaml
  arguments:
    - { command: rm, allArgsInside: ["/tmp/claude"], decision: allow }
    - { command: "rm|rmdir|mkdir|touch", anyArgOutside: ["/tmp/claude", "."], decision: ask }
  redirects:
    - { mode: write, outside: ["/tmp/claude", "."], decision: deny, description: "..." }
  ```
  Correct for multi-target commands, and the redirect rule subsumes the spike's `denyWritesOutsideSandbox` boolean (which can then be deprecated).
- The `filesystem` preset's `find -delete`/`sed -i` regex checks can stay as `checks`, or become argument rules (`{ command: find, anyArgMatches: '^-(delete|exec...)$', decision: deny }`).

## TypeScript types

```typescript
type RedirectMode = "read" | "write" | "append" | "any";

interface RedirectRule {
  mode: RedirectMode;
  outside?: string[];      // exactly one of outside | glob
  glob?: string;
  decision: Decision;
  description?: string;     // required for deny/ask
  alternative?: string;
}

interface ArgumentRule {
  command: string;         // name glob
  anyArgOutside?: string[];
  allArgsInside?: string[];
  anyArgMatches?: string;
  allArgsMatch?: string;
  decision: Decision;
  description?: string;
  alternative?: string;
}

interface BashConfig {
  /* …existing… */
  redirects?: RedirectRule[];   // ast only
  arguments?: ArgumentRule[];   // ast only
}
```

Both lists merge by concatenation (like `deny`/`checks`), so presets compose.

## Validation

- `redirects[]`: `mode` ∈ enum; exactly one of `outside`/`glob`; `decision` ∈ enum; `description` required for deny/ask; invalid `glob` skipped with a warning.
- `arguments[]`: `command` required; exactly one predicate; `decision` required; invalid `anyArgMatches`/`allArgsMatch` regex skipped with a warning.
- Both are no-ops under `parser: string`; the loader warns once if they are set while `parser` is not `ast`.

## Open choices (with recommendation)

1. **Relative-path resolution** — resolve args/targets against `cwd` so `..` escapes are caught. *Recommend yes;* it requires threading `cwd` into the AST evaluator (already in the hook input).
2. **`--flag=VALUE` paths** — test the `VALUE` half. *Recommend yes;* cheap and closes an obvious gap.
3. **Glob vs containment for sandboxing** — keep both: `outside`/`*Inside` (containment, the common case) and `glob` (precise patterns).
4. **Loose redirects ownership** — fold into most-restrictive rather than attributing to a command. *Recommend yes* for simplicity.
5. **Deny precedence over smart-allow** — keep deny strictly above allow-exceptions (can't allow past a deny). *Recommend keep.*

## Rollout

Ships under `parser: ast`, default off. Once `feature-19` is promoted, migrate the `claude`/`filesystem` presets to these rules and deprecate `denyWritesOutsideSandbox` and the sandbox `allowChecks` regex.
