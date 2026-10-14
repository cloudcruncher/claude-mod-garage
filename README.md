# Claude Mod Garage

A shelf of small, independent mods for [Claude Code](https://claude.com/claude-code). Install only the ones you want. Each has its own README with install steps and a sample of what it looks like.

**[Browse the demo site](https://cloudcruncher.github.io/claude-mod-garage/)** for a visual walkthrough of every mod, with copy-paste install commands.

15 mods in five groups: watch what is happening, stay safe, quality and flow, multi-session, and fun. They are independent: each is its own plugin, installs on its own, and removes cleanly.

## Quick start

1. Add the marketplace once:
   ```
   /plugin marketplace add cloudcruncher/claude-mod-garage
   ```
2. Install any mod by name:
   ```
   /plugin install agent-radar@mod-garage
   ```
3. Run `/reload-plugins` (or restart). Then use the mod's command (see tables) or just let it work.

Try one without installing: `git clone https://github.com/cloudcruncher/claude-mod-garage`, then `claude --plugin-dir ./claude-mod-garage/dev-mods/agent-radar`.

## Requirements

- A Claude Code build that supports plugin hook modules (`hooks/hooks.json` with a `"modules"` list). If `/plugin install` succeeds but nothing happens, your build is probably too old.
- The mods are TypeScript hook modules that Claude Code loads itself. There is nothing to compile and no runtime to install.
- Built and tested on macOS. Side panes dock beside the conversation from about 110 terminal columns; on narrower terminals they may not be shown.
- `verify-gate` and `git-band` shell out to your own tools (`npm`, `uv`, `make`, `git`). Those need to be on your `PATH`.

## Pick a mod


### Watch what's happening

_See your agents, git state and spend without leaving the terminal._

| Mod | What it does | Activate |
| --- | --- | --- |
| [**agent-radar**](dev-mods/agent-radar/README.md) | A live side window showing what your agents are doing, in parallel. | `/radar` opens the pane (Esc closes it). |
| [**git-band**](dev-mods/git-band/README.md) | Branch, dirty count and ahead/behind always visible above the prompt. | Automatic once installed. Nothing to run. |
| [**turn-recap**](dev-mods/turn-recap/README.md) | A toast after each long turn: how long, how many tools, which files. | Automatic once installed. |
| [**cost-router**](dev-mods/cost-router/README.md) | Usage in the status line, spend warnings, cheaper models for subagents. | Automatic once installed. |

### Stay safe

_Guardrails that stop mistakes before they cost you._

| Mod | What it does | Activate |
| --- | --- | --- |
| [**secret-guard**](dev-mods/secret-guard/README.md) | Stops secrets being written, committed or pushed. | Automatic once installed. |
| [**loop-breaker**](dev-mods/loop-breaker/README.md) | Cuts off a model that keeps repeating the same tool call. | Automatic once installed. |
| [**read-only-mode**](dev-mods/read-only-mode/README.md) | Look but don't touch: explore a codebase with edits disabled. | `/readonly on` to enable, `/readonly off` to disable, `/readonly status` to check. |
| [**auto-checkpoint**](dev-mods/auto-checkpoint/README.md) | Automatic snapshots before edits, so any change is undoable. | Snapshots are automatic. |
| [**context-guardian**](dev-mods/context-guardian/README.md) | Warns before the context window fills up. | Automatic once installed. |

### Quality & flow

_Faster prompts, automatic checks, and a record of what happened._

| Mod | What it does | Activate |
| --- | --- | --- |
| [**verify-gate**](dev-mods/verify-gate/README.md) | Runs your tests, lint and type-check after edits, and feeds failures back. | Automatic once installed. Needs a recognisable project (package.json, pyproject.toml or Makefile). |
| [**prompt-snippets**](dev-mods/prompt-snippets/README.md) | Type ;review or ;tests and it expands into a full instruction. | Type `;name` anywhere at the start of a word in a prompt. |
| [**session-journal**](dev-mods/session-journal/README.md) | One command turns the session into a shareable markdown timeline. | `/journal` any time; run it again to refresh the same file. |

### Multi-session

_Run several Claude sessions and keep them aware of each other._

| Mod | What it does | Activate |
| --- | --- | --- |
| **session-deck** (repo root) | See and message your other live Claude sessions. | `/live` opens the pane, `/peers` lists sessions, `/tell <id-prefix> <text>` messages one. |

### Wellbeing & fun

_For the long runs._

| Mod | What it does | Activate |
| --- | --- | --- |
| [**break-time**](dev-mods/break-time/README.md) | A coffee-break reminder with an animated pane. | Automatic reminders. |
| [**arcade**](dev-mods/arcade/README.md) | Doom-ish raycaster and Snake in a pane, for waiting on long runs. | `/doom`: WASD/arrows move, space shoots, `q` quits. |

## Mod details

Every mod in full. Click one to expand.

<details>
<summary><b>agent-radar</b>: A live side window showing what your agents are doing, in parallel.</summary>

Opens a pane beside the conversation that updates in real time. It shows what each loop is doing right now (thinking, writing its next message, starting a tool call) and the tool running (with a ticking timer) and what the model last said in its visible messages, every subagent with its recent calls and latest message, an activity log with a one-line result under each call, the files edited this session, and in the header a working/idle state, turn time, a context bar that shows how much this turn has added, and 5h usage. Ideal when you fan out several subagents and want to see who is doing what.

**Install**

```
/plugin install agent-radar@mod-garage
```

**Use it**

- `/radar` opens the pane (Esc closes it).
- Set option `autoOpen` to open it at every session start.

**What you'll see** _(illustrative)_

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

**Options**

| Option | Default | What it does |
| --- | --- | --- |
| `autoOpen` | false | Open the pane automatically at session start |

Set options when installing, or later in `/plugin` → the mod → configure.
**Notes**

- Panes dock beside the transcript from about 110 terminal columns; narrower terminals show it above the prompt.
- `[a3f1]` is the first 4 characters of a subagent id; calls with no tag are the main session's.
- Shows the model's visible messages only. Its private reasoning is never read or displayed.
- Redraws once a second while the pane is open.

</details>

<details>
<summary><b>git-band</b>: Branch, dirty count and ahead/behind always visible above the prompt.</summary>

Adds one dim line above the prompt with the current git branch, how many files changed, and commits ahead or behind upstream. It refreshes after every turn and every 15 seconds, so you notice at a glance when Claude has modified files or you are on the wrong branch.

**Install**

```
/plugin install git-band@mod-garage
```

**Use it**

- Automatic once installed. Nothing to run.

**What you'll see** _(illustrative)_

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
**Notes**

- Shows nothing outside a git repository.

</details>

<details>
<summary><b>turn-recap</b>: A toast after each long turn: how long, how many tools, which files.</summary>

When a turn runs longer than a threshold and used tools, shows a one-line toast so you can tab away during long runs and come back to a summary.

**Install**

```
/plugin install turn-recap@mod-garage
```

**Use it**

- Automatic once installed.

**What you'll see** _(illustrative)_

**Toast**

```
Turn done in 1m 35s · 12 tool calls · 3 files edited
```

**Options**

| Option | Default | What it does |
| --- | --- | --- |
| `minSeconds` | 20 | Turns shorter than this show no recap |

Set options when installing, or later in `/plugin` → the mod → configure.

</details>

<details>
<summary><b>cost-router</b>: Usage in the status line, spend warnings, cheaper models for subagents.</summary>

Shows `5h NN% | ctx NN%` in the status line, toasts once when your 5-hour usage passes 70% and 85%, and picks haiku/sonnet/opus for subagents that were given no model, based on keywords in their task. Explicit models are never overridden.

**Install**

```
/plugin install cost-router@mod-garage
```

**Use it**

- Automatic once installed.

**What you'll see** _(illustrative)_

**Status line**

```
5h 62% | ctx 34%
```

**Toast**

```
5h usage passed 70% (now 71%)
```
**Notes**

- With no subscription rate-limit data, values show as `n/a` and no toasts fire.

</details>

<details>
<summary><b>secret-guard</b>: Stops secrets being written, committed or pushed.</summary>

Refuses to write `.env`, `.pem`, SSH keys and credentials files, refuses commands that contain API keys or high-entropy tokens, blocks `git add`/`commit` of staged secrets, and blocks pushes to main/master and force pushes. `.env.example`-style files are allowed.

**Install**

```
/plugin install secret-guard@mod-garage
```

**Use it**

- Automatic once installed.

**What you'll see** _(illustrative)_

**Model tries to write .env**

```
secret-guard: refusing to write .env. .env is an environment file that usually holds secrets. Use a .env.example with placeholder values, or ask the user to edit it.
```

**Model tries to push**

```
secret-guard: git push blocked: pushing to main is not allowed.
```
**Notes**

- Fails closed: if the guard itself errors, the write or git command is blocked.

</details>

<details>
<summary><b>loop-breaker</b>: Cuts off a model that keeps repeating the same tool call.</summary>

If the same tool is called with identical arguments more than N times in a row, the next call is refused with a message telling the model to change approach, and you get a toast. Each subagent is judged on its own calls. If the hook errors it fails open.

**Install**

```
/plugin install loop-breaker@mod-garage
```

**Use it**

- Automatic once installed.

**What you'll see** _(illustrative)_

**Fourth identical call**

```
This exact Bash call has already run 3 times in a row with the same arguments. Repeating it will not change the result. Re-read the output, change the arguments, or try a different approach.
```

**Toast**

```
loop-breaker: refused a Bash call repeated 4 times
```

**Options**

| Option | Default | What it does |
| --- | --- | --- |
| `maxRepeats` | 3 | Identical calls allowed in a row |

Set options when installing, or later in `/plugin` → the mod → configure.

</details>

<details>
<summary><b>read-only-mode</b>: Look but don't touch: explore a codebase with edits disabled.</summary>

`/readonly on` refuses every file edit and every shell command that is not clearly read-only (ls, cat, grep, git status/log/diff, find without -delete...). Redirects, command substitution and unknown commands are refused. Great for onboarding to unfamiliar code or inspecting a production checkout.

**Install**

```
/plugin install read-only-mode@mod-garage
```

**Use it**

- `/readonly on` to enable, `/readonly off` to disable, `/readonly status` to check.

**What you'll see** _(illustrative)_

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
**Notes**

- It is a guardrail on the model's tool calls, not a sandbox: it does not stop you from running commands yourself.

</details>

<details>
<summary><b>auto-checkpoint</b>: Automatic snapshots before edits, so any change is undoable.</summary>

Snapshots files before the model edits them or runs risky shell commands. `/rewind-to` lists the checkpoints and restores one.

**Install**

```
/plugin install auto-checkpoint@mod-garage
```

**Use it**

- Snapshots are automatic.
- `/rewind-to list` shows checkpoints; `/rewind-to 2` restores checkpoint 2.

**What you'll see** _(illustrative)_

**/rewind-to list**

```
1  14:02  Edit src/auth.ts
2  14:05  Edit src/auth.ts
3  14:09  Bash git checkout -- .
```

**/rewind-to 2**

```
Rewound to checkpoint 2:
restored src/auth.ts
```
**Notes**

- Output format shown is illustrative.

</details>

<details>
<summary><b>context-guardian</b>: Warns before the context window fills up.</summary>

Toasts at 70% context. At 85% it also adds an instruction telling the model to wrap up the current step and run `/compact`, keeping the task, changed files, failing output, decisions and branch state.

**Install**

```
/plugin install context-guardian@mod-garage
```

**Use it**

- Automatic once installed.

**What you'll see** _(illustrative)_

**At 70%**

```
Context is 70% full. Consider /compact or delegating.
```

**At 85% (sent to the model)**

```
Context is nearly full (85% or more). Wrap up the current step, then run /compact.
```
**Notes**

- Toast wording is illustrative.

</details>

<details>
<summary><b>verify-gate</b>: Runs your tests, lint and type-check after edits, and feeds failures back.</summary>

After a turn that edited code, detects your project's fast checks (npm/pnpm/yarn/bun scripts for test, lint, typecheck; pytest, ruff, mypy/pyright via uv; `make test`) and runs them. Failures go back to the model so it fixes them, up to 3 retries. Docs, images and config edits are ignored.

**Install**

```
/plugin install verify-gate@mod-garage
```

**Use it**

- Automatic once installed. Needs a recognisable project (package.json, pyproject.toml or Makefile).

**What you'll see** _(illustrative)_

**All green**

```
verified
```

**Gives up**

```
verify-gate: still failing after 3 retries, giving up this turn
```

</details>

<details>
<summary><b>prompt-snippets</b>: Type ;review or ;tests and it expands into a full instruction.</summary>

Short `;name` shortcuts in a prompt expand to reusable instructions before Claude sees them. Ships with ;review ;tests ;plan ;explain ;short ;fix, and you can add your own.

**Install**

```
/plugin install prompt-snippets@mod-garage
```

**Use it**

- Type `;name` anywhere at the start of a word in a prompt.
- `/snippets` lists everything available.
- Add your own with the `extraSnippets` option (a JSON object).

**What you'll see** _(illustrative)_

**You type**

```
refactor the parser ;plan ;short
```

**Claude receives**

```
refactor the parser Before editing anything, outline a short plan: the goal, the files you will touch and how you will verify it. Then proceed. Keep the answer under 5 lines. Results first, no preamble.
```

**/snippets**

```
;review  Review the current changes for correctness bugs, security issues and missed…
;tests   Write focused tests for the behaviour above, run them, and report the result…
;plan    Before editing anything, outline a short plan: the goal, the files you will touc…
```

**Options**

| Option | Default | What it does |
| --- | --- | --- |
| `extraSnippets` | (empty) | JSON object of name -> text, e.g. {"ship":"Run the checks, then commit and push."} |

Set options when installing, or later in `/plugin` → the mod → configure.
**Notes**

- Unknown names such as `;foo` are left untouched.

</details>

<details>
<summary><b>session-journal</b>: One command turns the session into a shareable markdown timeline.</summary>

Quietly records your prompts, shell commands run and files edited. `/journal` writes them to `.claude/journal/<date-time>.md`, grouped under each prompt with a files-changed summary. Good for handoffs, standups and PR descriptions.

**Install**

```
/plugin install session-journal@mod-garage
```

**Use it**

- `/journal` any time; run it again to refresh the same file.

**What you'll see** _(illustrative)_

**/journal**

```
Journal written to .claude/journal/2026-10-14-09-30.md (23 entries).
```

**The file**

```
# Session 2026-10-14 09:30

## 09:30 · fix the login redirect

- ran `npm test`
- edited `src/auth.ts`
- ran `npm test`

## Files changed

- `src/auth.ts` (×1)
```
**Notes**

- Add `.claude/journal/` to .gitignore if you don't want to commit journals.
- Records are kept in memory (last 1000 entries), so a restart starts a fresh journal.

</details>

<details>
<summary><b>session-deck</b>: See and message your other live Claude sessions.</summary>

Keeps a shared roster of your running sessions (project, model, one-line AI summary of what each is doing). `/live` opens a pane with the roster, usage bars and a small pet; `/peers` lists other sessions; `/tell` sends one a message. Also asks before risky shell commands (force-delete, force-push, publishing) and chimes after turns longer than 30s.

**Install**

```
/plugin install session-deck@mod-garage
```

**Use it**

- `/live` opens the pane, `/peers` lists sessions, `/tell <id-prefix> <text>` messages one.
- The risky-command prompt and the chime are automatic.

**What you'll see** _(illustrative)_

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
**Notes**

- Sessions only see each other on the same machine and user.
- Install name: `session-deck` (the repo root is itself a plugin).

</details>

<details>
<summary><b>break-time</b>: A coffee-break reminder with an animated pane.</summary>

Tracks active time and, after a while, toasts and opens an animated ASCII coffee-break pane with a countdown and stretch tips.

**Install**

```
/plugin install break-time@mod-garage
```

**Use it**

- Automatic reminders.
- `/break` starts a break now, `/break-skip` snoozes 15 minutes, `/break-done` resets the timer.

**What you'll see** _(illustrative)_

**Toast**

```
Time for a coffee break. Run /break (or /break-skip to snooze).
```

**Options**

| Option | Default | What it does |
| --- | --- | --- |
| `intervalMinutes` | 150 | Active minutes between reminders |
| `breakMinutes` | 5 | Countdown length |

Set options when installing, or later in `/plugin` → the mod → configure.

</details>

<details>
<summary><b>arcade</b>: Doom-ish raycaster and Snake in a pane, for waiting on long runs.</summary>

Tiny text-mode games that run inside Claude Code. /doom is a raycaster with wandering enemies and a minimap; /snake is classic snake.

**Install**

```
/plugin install arcade@mod-garage
```

**Use it**

- `/doom`: WASD/arrows move, space shoots, `q` quits.
- `/snake`: WASD/arrows steer, `r` restarts, `q` quits.

**What you'll see** _(illustrative)_

**/snake**

```
┌──────────────┐
│              │
│   ████►   ●  │
│              │
└──────────────┘  score 3
```
**Notes**

- Doom needs a pane of at least 40x16; 80x30 or larger looks best.
- Keys only reach a game while its pane has focus. Esc closes it.
- Key presses move in steps (terminals give no key-up), so tap rather than hold.

</details>


## Managing mods

| Task | Command |
| --- | --- |
| See what is installed | `/plugin` |
| Update a mod | `/plugin marketplace update mod-garage` then `/reload-plugins` |
| Turn a mod off without removing it | `/plugin disable <name>@mod-garage` |
| Remove a mod | `/plugin uninstall <name>@mod-garage` |
| Set a mod's options | `/plugin` → pick the mod → configure |

## Safety notes

- `secret-guard` fails closed: if the guard itself errors, the write or git command is blocked. `loop-breaker` fails open so a bug in it never stops your work.
- `read-only-mode` is a guardrail on the model's tool calls, not a sandbox.
- `session-journal` and `auto-checkpoint` write inside your project (`.claude/journal/`, checkpoints). Add them to `.gitignore` if you do not want them committed.
- Nothing in this repo makes network calls of its own, and no mod sends your prompts anywhere.

## Troubleshooting

- **Installed but nothing shows:** run `/reload-plugins`, then `/plugin` and confirm it is enabled.
- **Pane does not open:** the terminal may be too narrow (panes dock from about 110 columns). Widen it and retry.
- **Command not found:** the slash command only exists once the mod is enabled and reloaded.
- **Something looks wrong:** `claude plugin validate <path>` reports problems with a mod's manifest or hooks, and `claude --debug` logs hook failures.

## Develop

```
claude plugin validate dev-mods/<name>
claude plugin test dev-mods/<name>
python3 scripts/gen_docs.py     # regenerate these docs from scripts/gen_docs.py
```

Each mod keeps pure logic in `lib.ts` with unit tests and the hook wiring in `register.ts(x)`. Test mods one folder at a time: running `claude plugin test` at the repo root also loads the root plugin's hooks into every nested test.

## License

MIT
