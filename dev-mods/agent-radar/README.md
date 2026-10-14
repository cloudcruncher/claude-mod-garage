# agent-radar

A live side window showing what your agents are doing, in parallel.

Opens a pane beside the conversation that updates in real time: which tools are running right now, every subagent with its task and current tool, a scrolling activity log with elapsed times, and the files edited this session. Ideal when you fan out several subagents and want to see who is doing what.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
/plugin install agent-radar@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/agent-radar`

## Use it

- `/radar` opens the pane (Esc closes it).
- Set option `autoOpen` to open it at every session start.

## What you'll see

_Illustrative output._

**/radar pane**

```
● 2 running  ·  14 calls  ·  2/3 agents active

Agents
▶ Explore · map auth flow  → Grep validateToken
▶ general-purpose · write tests  → Edit auth/token.test.ts
· Plan · outline migration

Activity
▶ [a3f1] Grep validateToken  2s
▶ [9c20] Edit auth/token.test.ts  1s
✓ Bash npm test  14s
✗ Bash npx tsc --noEmit  6s
✓ Read src/auth.ts  0s

Files touched
  auth/token.test.ts ×2
  src/auth.ts
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `autoOpen` | false | Open the pane automatically at session start |

Set options when installing, or later in `/plugin` → the mod → configure.
## Notes

- Panes dock beside the transcript from about 110 terminal columns; narrower terminals show it above the prompt.
- `[a3f1]` is the first 4 characters of a subagent id; calls with no tag are the main session's.
