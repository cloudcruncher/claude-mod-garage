# agent-radar

A live pane beside the conversation showing what Claude and its subagents are doing right now.

- **Header**: running tool count, total calls, active/total subagents.
- **Agents**: each subagent's type, task and the tool it is on.
- **Activity**: newest tool calls with status (`▶` running, `✓` done, `✗` failed) and elapsed time; `[abcd]` marks calls made inside a subagent.
- **Files touched**: files edited this session, busiest first.

Open with `/radar` (Esc closes). Panes dock beside the transcript from about 110 terminal columns, else open above the prompt.

Option `autoOpen` (default off) opens the pane at session start.
