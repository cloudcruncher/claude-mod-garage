# turn-recap

A toast after each long turn: how long, how many tools, which files.

When a turn runs longer than a threshold and used tools, shows a one-line toast so you can tab away during long runs and come back to a summary.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
/plugin install turn-recap@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/turn-recap`

## Use it

- Automatic once installed.

## What you'll see

_Illustrative output._

**Toast**

```
Turn done in 1m 35s · 12 tool calls · 3 files edited
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `minSeconds` | 20 | Turns shorter than this show no recap |

Set options when installing, or later in `/plugin` → the mod → configure.
