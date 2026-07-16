---
name: fencepost-audit
description: Analyse fencepost permission decisions and suggest config improvements
---

Run the fencepost audit tool to analyse recent permission decisions and suggest config improvements.

Execute `node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js audit` (in a development clone of the repo: `node dist/index.js audit`) and present the output to the user.

The audit log is user-level and shared across projects; by default the analysis is filtered to the current project. If the user asks for a cross-project view, add the `--global` flag.
