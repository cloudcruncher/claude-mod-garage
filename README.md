# session-deck

See and message your other live Claude sessions.

Keeps a shared roster of your running sessions (project, model, one-line AI summary of what each is doing). `/live` opens a pane with the roster, usage bars and a small pet; `/peers` lists other sessions; `/tell` sends one a message. Also asks before risky shell commands (force-delete, force-push, publishing) and chimes after turns longer than 30s.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install session-deck@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./.`

## Use it

- `/live` opens the pane, `/peers` lists sessions, `/tell <id-prefix> <text>` messages one.
- The risky-command prompt and the chime are automatic.

## What you'll see

_Illustrative output._

**/peers**

```
a1b2c3d4  sonnet  /work/api   fixing token refresh bug
9f8e7d6c  opus    /work/web   reviewing checkout redesign
```

**/tell 9f8e Please rebase on main**

```
Sent to 9f8e7d6c
```

**Risky command prompt**

```
DESTRUCTIVE: force/recursive delete | run it? rm -rf src
  [Run it]  [Refuse]
```
## Notes

- Sessions only see each other on the same machine and user.
- Install name: `session-deck` (the repo root is itself a plugin).
