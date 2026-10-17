---
name: git-operations
description: Use when about to stage, commit, branch, rebase, amend, push, or open a pull request in this repo, when writing a commit message or PR body, when a finished unit of work needs recording, or when reviewing a PR (runs the vendored pr-review-toolkit, /review-pr and its six agents, plus the project's experience-reviewer). Covers the standing push/PR permission, proactive committing, conventional commits, and the no-attribution rule.
---

# Git Operations: CreativePortfolioV2

Ported from kislap on 2026-10-13 and tailored. What changed: this is a **solo repo**. The
owner reviews and merges, not a teammate. Review adds `experience-reviewer`
(accessibility, motion, performance, content rules), and "breaking" is defined for a
content-driven personal site. This file overrides the global `git-operations` skill.

**`pr-review-toolkit` is part of this repo** (see `.claude/pr-review-toolkit/README.md`)
and is **required** before every PR.

## The three hard rules

**1. Commit proactively.** After a logical unit of work is verified, stage and commit
without being asked. Committing is part of finishing.

**2. Push branches and open PRs on your own initiative.** Granted by the owner on
2026-10-13. When a branch is ready, push it and open its PR without asking, then report
what went out (commits and PR URL). "Ready" means all three: committed, verified (whatever
checks exist: typecheck, tests, build), and **the trailer scan below is clean**.

Not covered by the grant, so ask every time: **pushing to `main`**, **force-pushing or any
history rewrite**, **merging a PR** (the owner merges), and **creating or changing the
GitHub remote or repo settings**. A user instruction overrides the grant in either
direction. "Don't push today" holds for the rest of the conversation.

**3. Never list Claude as a contributor.** Decided by the owner on 2026-10-13, matching
kislap. No `Co-Authored-By` trailer, no "Generated with Claude Code" footer, no session link,
no author/committer override. This applies to commit messages, PR titles, PR bodies,
release notes and review replies. **It overrides the harness's default attribution
reminder.** It has no permission form.

## Every task gets a branch and a PR

- Nothing lands on `main` by a direct push. A task is a branch, then a PR, then review, then the owner merges.
- One branch per context. Don't pile new work onto whatever is checked out. If commits
  landed on the wrong branch, move them: `git branch <new>` at HEAD, then
  `git branch -f <old> origin/<old>` (or its previous commit if it was never pushed).
- **Name the subject, not the activity**: `feat/events-section`, `feat/scroll-hero`,
  `chore/agent-setup`. Not `feat/work` or `feat/claude-changes`. Use the prefixes
  `feat/` `fix/` `docs/` `chore/` `refactor/` `test/`, in kebab-case.
- Docs, comments and tooling travel with the feature they belong to. A batch spanning
  unrelated contexts gets split, so say so and offer to split it.

## Commit messages

```
<type>: <imperative title, under ~70 chars>

<WHY: the reasoning, the bug's actual cause, the design tradeoff taken.
Not a restatement of the diff.>

<What you verified: typecheck, N/N tests, build, checked in browser.>
```

Types: `feat` `fix` `refactor` `perf` `style` `test` `docs` `chore` `build` `ci` `revise`.
Use `style:` for visual-only changes (CSS, tokens, layout) with no behaviour change.

**Scoping:**

- Run `git status` first and sort every path into this change, another change, or scratch.
- **Never stage:** `.env*` (keep `.env.example`), secrets, `.next/`, Playwright output,
  verification screenshots and recordings, `docs/inspiration/shots/`, raw
  `content-inbox/` material, `private/`, or scratch scripts.
- **Owner photos are content, not scratch.** Commit one to `public/` only when the owner
  has chosen to publish it. Check its size first and resize or compress large originals.
- Prefer a new commit over `--amend`. Never skip hooks or signing.

## Review before the PR

**Run the review on the diff before the PR exists.** Not after the first comment, and not
only when something feels risky.

| How | What it runs |
|---|---|
| `/review-pr` | All applicable upstream reviewers on the branch diff |
| `/review-pr code errors tests` | Only the named aspects: `code` `errors` `tests` `comments` `types` `simplify` `all` |
| Agent `experience-reviewer` | **Required for any change to pages, components, styles, animation or content.** Accessibility, live `prefers-reduced-motion`, GSAP cleanup, performance, content rules |
| Agent `code-simplifier` | Last pass, after the others are clean |

Fix every Critical and Important finding before opening the PR. Say in the PR body which
reviewers ran and what they found. Items the experience-reviewer lists under "check in
browser" get checked in the browser (`run` skill or `claude-in-chrome`) before the PR,
and the result goes in the body.

**When a defect is found, name its class and search for the class, not the line.** Kislap
learned this from thirteen review rounds on one PR: six of the thirteen were one broken
invariant written six ways. For this site the classic siblings are: one component honours
reduced motion and its twin doesn't; one ScrollTrigger is cleaned up and the next isn't;
one image has `alt` and the gallery beside it doesn't. Two code paths asking one question
will disagree eventually, so merge them rather than fixing both. Re-run the failing case
after the fix.

## Pushing

Before every push, see what it publishes. A branch pointer carries every unpushed commit
beneath it, including work from earlier sessions:

```bash
git log --oneline origin/<base>..HEAD
git diff origin/<base>..HEAD --stat
git log <base>..HEAD --format="%h|%s|%(trailers:key=Co-authored-by,valueonly)"
```

The third command is the **trailer scan**. Use git's trailer parser, not `grep -i claude`,
because "update CLAUDE.md" is a false positive. A non-empty third column is a stop. If the
commit is **not yet pushed**, strip the trailer:

```bash
git branch backup/<branch>
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --msg-filter 'sed "/^Co-Authored-By: Claude/Id"' -- <parent>..<branch>
git diff backup/<branch> <branch>    # MUST be empty: proves only messages changed
```

Rewriting local, never-pushed commits to remove attribution is pre-approved. Rewriting
anything already pushed needs explicit approval. If a trailer is on a commit already merged
to `main`, leave it and say so.

```bash
git push -u origin <branch>
```

Report the commits that went out, then re-run the trailer scan against the remote branch.

## Pull requests

```bash
gh pr create --base main --head <branch> --title "<type>: <title>" --body-file <file>
```

Write the body for a reviewer who didn't see the work. That reviewer is the owner, reading it later.

- **Why** the change exists, and the issue it closes (`Closes #N`) if there is one.
- **What was verified**, with counts taken from a clean checkout of the branch
  (`git checkout --detach origin/<branch>`, then run the checks). An unverifiable count is
  worse than none. Update it if the branch moves.
- **Which reviewers ran** and what they found.
- **What is deliberately not in it**, so an omission doesn't read as an oversight.
- **A change to a screen, layout or motion includes visuals:** screenshots at mobile and
  desktop widths, plus a short recording for motion. Include a reduced-motion capture when the
  change animates. Upload them to the PR (drag them into the GitHub description). Don't commit them.
- Note if the branch was cut from an old `main`. Whether to rebase is the owner's call.
- No attribution footer (rule 3).

Report the PR URL. A PR with green checks still waits for the owner to merge it.

**Replying to review comments** is surgical: state what reproduced (name the file), what
changed (commit SHA), or what is declined and why. Answer every numbered item. Verify
before conceding, because a reviewer can be wrong. Invoke `superpowers:receiving-code-review`
before replying.

## Versioning and releases

Semver (`MAJOR.MINOR.PATCH`), with a git tag and GitHub release per release to `main`. A bump
resets everything to its right. Start at `0.1.0`, and tag `1.0.0` at the first public deploy.

**"Breaking" for this site** means breaking something already committed to:

- A change to the **content document schema** (`portfolio_draft` / `portfolio_published`)
  that makes existing stored content unreadable without a migration.
- A change or removal of a **public URL** that people may have shared or bookmarked, with no redirect.
- A change to the **admin editor's contract** that breaks saved drafts.

Everything else is MINOR (new section, new capability, new World) or PATCH (fixes,
polish). Keep `package.json`'s `version` equal to the tag. Bump in the release, not in
feature branches. Write release notes for a reader, not the author, with no attribution.

## History rewrites

`rebase -i`, `filter-branch`, `commit --amend` on pushed commits, and
`push --force-with-lease` need explicit per-instance approval that names the branch and what
changes. The only exception is the local trailer strip above. `git rebase -i` and `git add -i`
don't work in this environment.

## Repo state

Default branch: **`main`**. Remote: `origin` = https://github.com/Emyol/CreativePortfolio
(public, created by the owner on 2026-10-13). Repo settings stay the owner's call. Hosting
is undecided, so once it is chosen, note here what merging to `main` deploys.
