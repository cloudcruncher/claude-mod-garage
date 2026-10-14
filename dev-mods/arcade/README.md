# arcade

Doom-ish raycaster and Snake in a pane, for waiting on long runs.

Tiny text-mode games that run inside Claude Code. /doom is a raycaster with wandering enemies and a minimap; /snake is classic snake.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
/plugin install arcade@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/arcade`

## Use it

- `/doom`: WASD/arrows move, space shoots, `q` quits.
- `/snake`: WASD/arrows steer, `r` restarts, `q` quits.

## What you'll see

_Illustrative output._

**/snake**

```
┌──────────────┐
│              │
│   ████►   ●  │
│              │
└──────────────┘  score 3
```
## Notes

- Doom needs a pane of at least 40x16; 80x30 or larger looks best.
- Keys only reach a game while its pane has focus. Esc closes it.
- Key presses move in steps (terminals give no key-up), so tap rather than hold.
