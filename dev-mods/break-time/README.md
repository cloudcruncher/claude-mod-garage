# break-time

A coffee-break reminder with an animated pane.

Tracks active time and, after a while, toasts and opens an animated ASCII coffee-break pane with a countdown and stretch tips.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install break-time@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/break-time`

## Use it

- Automatic reminders.
- `/break` starts a break now, `/break-skip` snoozes 15 minutes, `/break-done` resets the timer.

## What you'll see

_Illustrative output._

**Toast**

```
Time for a coffee break. Run /break (or /break-skip to snooze).
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `intervalMinutes` | 150 | Active minutes between reminders |
| `breakMinutes` | 5 | Countdown length |

Set options when installing, or later in `/plugin` → the mod → configure.
