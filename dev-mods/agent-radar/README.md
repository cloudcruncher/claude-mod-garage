# agent-radar

A live side window showing what your agents are doing, in parallel.

Opens a pane beside the conversation that updates in real time. It shows what each loop is doing right now (thinking, writing its next message, starting a tool call) and the tool running (with a ticking timer) and what the model last said in its visible messages, every subagent with its recent calls and latest message, an activity log with a one-line result under each call, the files edited this session, and in the header a working/idle state, turn time, a context bar that shows how much this turn has added, and 5h usage. Ideal when you fan out several subagents and want to see who is doing what.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
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
● working (2 tools running)  ·  turn 1m12s  ·  14 calls  ·  5h 8%
ctx ███░░░░░░░ 34%  (+6% this turn)

Now
● main writing: “Running the suite before I touch the parser…”  3s
▶ Bash npm test -- --watch=false  8s
▶ [a3f1] Grep validateToken  2s
  “Running the suite before I touch the parser, then I'll fix whatever fails.”

Agents  (3 spawned)
▶ Explore · map auth flow
    ✓ Read src/auth.ts  0s
    ✓ Grep validateToken  1s
    “Token checks live in src/auth.ts and middleware/session.ts.”
· Plan · outline migration

Activity
✓ Bash npm test  14s
    → 12 passed
✗ Bash npx tsc --noEmit  6s
    → src/auth.ts(41,5): error TS2322: Type 'string' is not assignable…
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
- Shows the model's visible messages only. Its private reasoning is never read or displayed.
- Redraws once a second while the pane is open.
