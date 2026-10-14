# auto-checkpoint

Automatic snapshots before edits, so any change is undoable.

Snapshots files before the model edits them or runs risky shell commands. `/rewind-to` lists the checkpoints and restores one.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
/plugin install auto-checkpoint@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/auto-checkpoint`

## Use it

- Snapshots are automatic.
- `/rewind-to list` shows checkpoints; `/rewind-to 2` restores checkpoint 2.

## What you'll see

_Illustrative output._

**/rewind-to list**

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
