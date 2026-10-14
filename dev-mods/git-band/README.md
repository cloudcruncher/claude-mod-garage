# git-band

Branch, dirty count and ahead/behind always visible above the prompt.

Adds one dim line above the prompt with the current git branch, how many files changed, and commits ahead or behind upstream. It refreshes after every turn and every 15 seconds, so you notice at a glance when Claude has modified files or you are on the wrong branch.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
/plugin install git-band@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/git-band`

## Use it

- Automatic once installed. Nothing to run.

## What you'll see

_Illustrative output._

**Above the prompt**

```
⎇ feature/login ● 3 changed ↑1
> _
```

**After committing**

```
⎇ feature/login ✓ clean ↑2
> _
```
## Notes

- Shows nothing outside a git repository.
