# context-guardian

Warns before the context window fills up.

Toasts at 70% context. At 85% it also adds an instruction telling the model to wrap up the current step and run `/compact`, keeping the task, changed files, failing output, decisions and branch state.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install context-guardian@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/context-guardian`

## Use it

- Automatic once installed.

## What you'll see

_Illustrative output._

**At 70%**

```
Context is 70% full. Consider /compact or delegating.
```

**At 85% (sent to the model)**

```
Context is nearly full (85% or more). Wrap up the current step, then run /compact.
```
## Notes

- Toast wording is illustrative.
