# cost-router

Usage in the status line, spend warnings, cheaper models for subagents.

Shows `5h NN% | ctx NN%` in the status line, toasts once when your 5-hour usage passes 70% and 85%, and picks haiku/sonnet/opus for subagents that were given no model, based on keywords in their task. Explicit models are never overridden.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install cost-router@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/cost-router`

## Use it

- Automatic once installed.

## What you'll see

_Illustrative output._

**Status line**

```
5h 62% | ctx 34%
```

**Toast**

```
5h usage passed 70% (now 71%)
```
## Notes

- With no subscription rate-limit data, values show as `n/a` and no toasts fire.
