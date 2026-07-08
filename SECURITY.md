# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public issues.**

Use GitHub's private vulnerability reporting: go to the
[**Security** tab](https://github.com/ch4nn0n/fencepost/security) →
**Report a vulnerability**. This opens a private advisory visible only to the
maintainers.

Please include enough detail to reproduce: the input (tool call / command), the
fencepost config, and what you expected versus what happened. We'll acknowledge
the report and work with you on a fix and disclosure timeline.

## Supported versions

fencepost is pre-1.0; only the latest release receives fixes.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| older   | ❌        |

## Security model

fencepost is a **guard rail, not a sandbox.** It intercepts tool calls and
enforces a policy you configure, which prevents accidental damage and steers an
agent away from disallowed actions. It does **not** contain a determined
adversary: dynamically constructed or obfuscated commands have the same ceiling
here as anywhere else (see the [nested-interpreter
limits](https://ch4nn0n.github.io/fencepost/docs/configuration/interpreters)).

The most security-relevant behaviour is the [failure
posture](https://ch4nn0n.github.io/fencepost/docs/concepts/failure-posture): a
broken or invalid config **fails closed** (denies everything until fixed), while
an un-checkable command follows the configured `onError` (default `ask`). Bugs
that cause fencepost to **allow** something it was configured to deny, or to
fail *open* when it should fail closed, are in scope and worth reporting.
