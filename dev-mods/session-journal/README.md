# session-journal

One command turns the session into a shareable markdown timeline.

Quietly records your prompts, shell commands run and files edited. `/journal` writes them to `.claude/journal/<date-time>.md`, grouped under each prompt with a files-changed summary. Good for handoffs, standups and PR descriptions.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
/plugin install session-journal@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/session-journal`

## Use it

- `/journal` any time; run it again to refresh the same file.

## What you'll see

_Illustrative output._

**/journal**

```
Journal written to .claude/journal/2026-10-14-09-30.md (23 entries).
```

**The file**

```
# Session 2026-10-14 09:30

## 09:30 · fix the login redirect

- ran `npm test`
- edited `src/auth.ts`
- ran `npm test`

## Files changed

- `src/auth.ts` (×1)
```
## Notes

- Add `.claude/journal/` to .gitignore if you don't want to commit journals.
- Records are kept in memory (last 1000 entries), so a restart starts a fresh journal.
