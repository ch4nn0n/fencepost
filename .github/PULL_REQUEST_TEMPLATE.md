<!--
Thanks for contributing to fencepost! Please use a Conventional Commit style
PR title (e.g. "feat: ...", "fix: ...", "docs: ...") — release-please uses it
to build the changelog and version bumps.
-->

## What & why

<!-- What does this change, and why? Link any related issue (e.g. "Closes #12"). -->

## Checklist

- [ ] `bun test` passes (added/updated tests for behaviour changes)
- [ ] `bun run typecheck` is clean
- [ ] If I changed `src/`, I ran `bun run build` and **committed the updated `dist/`** (CI fails if it's stale)
- [ ] Docs updated if behaviour or config changed (`docs/docs/…`)
- [ ] PR title follows [Conventional Commits](https://www.conventionalcommits.org/)
