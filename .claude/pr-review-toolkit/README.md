# pr-review-toolkit (vendored)

Copied on 2026-10-13 from the kislap project's vendored copy, which came from Anthropic's
`pr-review-toolkit` Claude Code plugin (`claude-plugins-official`), Apache License 2.0 (see
`LICENSE`). Vendored so the reviewers travel with the repo and don't depend on the global
`~/.claude` copy.

| File | Agent / command | Reviews |
|---|---|---|
| `.claude/agents/code-reviewer.md` | `code-reviewer` | Project rules (CLAUDE.md), bugs, quality |
| `.claude/agents/silent-failure-hunter.md` | `silent-failure-hunter` | Swallowed errors, bad fallbacks |
| `.claude/agents/pr-test-analyzer.md` | `pr-test-analyzer` | Test coverage gaps |
| `.claude/agents/comment-analyzer.md` | `comment-analyzer` | Comment accuracy and rot |
| `.claude/agents/type-design-analyzer.md` | `type-design-analyzer` | Type invariants and encapsulation |
| `.claude/agents/code-simplifier.md` | `code-simplifier` | Simplification after review passes |
| `.claude/commands/review-pr.md` | `/review-pr [aspects]` | Runs the agents above on the current change |

**Not upstream:** `.claude/agents/experience-reviewer.md` is this project's own reviewer. It
covers accessibility, motion, performance and the content rules. `/review-pr` doesn't call
it; `git-operations` says when to run it.

**How we use it:** see `.claude/skills/git-operations/SKILL.md`, section "Review before
the PR".

Upstream files are unchanged, except that `review-pr.md` uses the short `/review-pr` name
(from the global copy) in place of `/pr-review-toolkit:review-pr`. To update, copy the
files again from the plugin and keep this README.
