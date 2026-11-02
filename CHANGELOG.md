# Changelog

## Unreleased

Fixes from the review of 0.1.0.

- verify-gate: no longer appends to `~/.claude/state/wins.md`; pytest runs only when declared in pyproject or requirements; checks run with `CI=1`.
- auto-checkpoint: a file is recorded as saved only when its copy succeeded; restore copies to a temp file and renames into place instead of deleting first; files over 50MB, `node_modules` and `.git` are skipped and logged; `git checkout .`, `git stash` and `git clean` are now treated as risky (`git clean` warns, as untracked files cannot be snapshotted).
- secret-guard: `git push origin HEAD` and a bare `:` refspec count as the current branch; git runs in the session directory and honours `cd <dir> &&` and `git -C <dir>`; file content being written is scanned for secrets; blocking pushes to main is now the `blockMainPush` option (default on).
- loop-breaker: history resets each turn; new `allowlist` option (polling calls such as `TaskOutput`, `gh run view`, `git status` may repeat); `maxRepeats` must be a positive whole number or the default is used.
- session-deck: new `sessionSummary` option to switch off the haiku summary call; the README now says the summary is sent to the model.
- session-deck: `/peers` is a name Claude Code reserves, so the command is now `/sessions`.
- secret-guard: pushes fail closed when HEAD cannot be resolved; `git push origin :` is treated like `--all`; `--mirror` is always refused; `cd` with `~` or relative paths is resolved.
- README: corrected the auto-checkpoint location (`~/.claude/checkpoints`) and privacy note, real `/rewind-to` forms, tested Claude Code version, how to run tests.
- Removed the orphaned `session-peers` mod (covered by session-deck) and the second marketplace file `dev-mods/.claude-plugin/marketplace.json`; added a description to the marketplace; added SECURITY.md.

## 0.1.0

First release: 15 mods (agent-radar, git-band, turn-recap, cost-router, secret-guard, loop-breaker, read-only-mode, verify-gate, auto-checkpoint, context-guardian, prompt-snippets, session-journal, session-deck, break-time, arcade).
