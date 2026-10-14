# read-only-mode

Look but don't touch: explore a codebase with edits disabled.

`/readonly on` refuses every file edit and every shell command that is not clearly read-only (ls, cat, grep, git status/log/diff, find without -delete...). Redirects, command substitution and unknown commands are refused. Great for onboarding to unfamiliar code or inspecting a production checkout.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install read-only-mode@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/read-only-mode`

## Use it

- `/readonly on` to enable, `/readonly off` to disable, `/readonly status` to check.

## What you'll see

_Illustrative output._

**Enable**

```
> /readonly on
Read-only mode ON: edits and mutating commands are refused.
```

**Model tries to edit**

```
Read-only mode is on (the user ran /readonly on). Do not edit files; describe the change instead.
```

**Status line**

```
🔒 read-only
```
## Notes

- It is a guardrail on the model's tool calls, not a sandbox: it does not stop you from running commands yourself.
