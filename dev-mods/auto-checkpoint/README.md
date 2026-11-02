# auto-checkpoint

Automatic snapshots before edits, so any change is undoable.

Snapshots files before the model edits them or runs risky shell commands (rm, mv, git reset --hard, git checkout ., git stash, git clean). `/rewind-to` lists the checkpoints and restores one. Files over 50MB, node_modules and .git are skipped and the skip is logged; `git clean` deletes untracked files, which cannot be snapshotted, so you get a warning instead.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install auto-checkpoint@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/auto-checkpoint`

## Use it

- Snapshots are automatic.
- `/rewind-to` shows checkpoints; `/rewind-to 2` restores checkpoint 2; `/rewind-to last` restores the newest.

## What you'll see

_Illustrative output._

**/rewind-to**

```
1  14:02  Edit src/auth.ts
2  14:05  Edit src/auth.ts
3  14:09  Bash git checkout -- .
```

**/rewind-to 2**

```
Rewound to checkpoint 2:
restored src/auth.ts
```
## Notes

- Output format shown is illustrative.
- Privacy: checkpoints are full copies of the files you edit or delete, stored in `~/.claude/checkpoints/<session>/` (not in your project). That includes `.env` and other secret files if they are touched. The newest 200 checkpoints are kept; delete the folder to clear them.
