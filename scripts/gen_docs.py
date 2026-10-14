#!/usr/bin/env python3
"""Generates README.md, each mod's README.md and docs/index.html from the one table below.
Run: python3 scripts/gen_docs.py   (stdlib only)"""
import html, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARKET = "mod-garage"
REPO = "claude-mod-garage"

GROUPS = [
    ("watch", "Watch what's happening", "See your agents, git state and spend without leaving the terminal."),
    ("protect", "Stay safe", "Guardrails that stop mistakes before they cost you."),
    ("flow", "Quality & flow", "Faster prompts, automatic checks, and a record of what happened."),
    ("sessions", "Multi-session", "Run several Claude sessions and keep them aware of each other."),
    ("fun", "Wellbeing & fun", "For the long runs."),
]

# path: where the mod lives relative to the repo root
MODS = [
 dict(id="agent-radar", group="watch", path="dev-mods/agent-radar", tagline="A live side window showing what your agents are doing, in parallel.",
  what="Opens a pane beside the conversation that updates in real time: which tools are running right now, every subagent with its task and current tool, a scrolling activity log with elapsed times, and the files edited this session. Ideal when you fan out several subagents and want to see who is doing what.",
  activate=["`/radar` opens the pane (Esc closes it).", "Set option `autoOpen` to open it at every session start."],
  options=[("autoOpen", "false", "Open the pane automatically at session start")],
  demo=[("/radar pane", """● 2 running  ·  14 calls  ·  2/3 agents active

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
  src/auth.ts""")],
  notes=["Panes dock beside the transcript from about 110 terminal columns; narrower terminals show it above the prompt.", "`[a3f1]` is the first 4 characters of a subagent id; calls with no tag are the main session's."]),
 dict(id="git-band", group="watch", path="dev-mods/git-band", tagline="Branch, dirty count and ahead/behind always visible above the prompt.",
  what="Adds one dim line above the prompt with the current git branch, how many files changed, and commits ahead or behind upstream. It refreshes after every turn and every 15 seconds, so you notice at a glance when Claude has modified files or you are on the wrong branch.",
  activate=["Automatic once installed. Nothing to run."], options=[],
  demo=[("Above the prompt", """⎇ feature/login ● 3 changed ↑1
> _"""), ("After committing", """⎇ feature/login ✓ clean ↑2
> _""")],
  notes=["Shows nothing outside a git repository."]),
 dict(id="turn-recap", group="watch", path="dev-mods/turn-recap", tagline="A toast after each long turn: how long, how many tools, which files.",
  what="When a turn runs longer than a threshold and used tools, shows a one-line toast so you can tab away during long runs and come back to a summary.",
  activate=["Automatic once installed."], options=[("minSeconds", "20", "Turns shorter than this show no recap")],
  demo=[("Toast", "Turn done in 1m 35s · 12 tool calls · 3 files edited")], notes=[]),
 dict(id="cost-router", group="watch", path="dev-mods/cost-router", tagline="Usage in the status line, spend warnings, cheaper models for subagents.",
  what="Shows `5h NN% | ctx NN%` in the status line, toasts once when your 5-hour usage passes 70% and 85%, and picks haiku/sonnet/opus for subagents that were given no model, based on keywords in their task. Explicit models are never overridden.",
  activate=["Automatic once installed."], options=[],
  demo=[("Status line", "5h 62% | ctx 34%"), ("Toast", "5h usage passed 70% (now 71%)")],
  notes=["With no subscription rate-limit data, values show as `n/a` and no toasts fire."]),
 dict(id="secret-guard", group="protect", path="dev-mods/secret-guard", tagline="Stops secrets being written, committed or pushed.",
  what="Refuses to write `.env`, `.pem`, SSH keys and credentials files, refuses commands that contain API keys or high-entropy tokens, blocks `git add`/`commit` of staged secrets, and blocks pushes to main/master and force pushes. `.env.example`-style files are allowed.",
  activate=["Automatic once installed."], options=[],
  demo=[("Model tries to write .env", "secret-guard: refusing to write .env. .env is an environment file that usually holds secrets. Use a .env.example with placeholder values, or ask the user to edit it."), ("Model tries to push", "secret-guard: git push blocked: pushing to main is not allowed.")],
  notes=["Fails closed: if the guard itself errors, the write or git command is blocked."]),
 dict(id="loop-breaker", group="protect", path="dev-mods/loop-breaker", tagline="Cuts off a model that keeps repeating the same tool call.",
  what="If the same tool is called with identical arguments more than N times in a row, the next call is refused with a message telling the model to change approach, and you get a toast. Each subagent is judged on its own calls. If the hook errors it fails open.",
  activate=["Automatic once installed."], options=[("maxRepeats", "3", "Identical calls allowed in a row")],
  demo=[("Fourth identical call", "This exact Bash call has already run 3 times in a row with the same arguments. Repeating it will not change the result. Re-read the output, change the arguments, or try a different approach."), ("Toast", "loop-breaker: refused a Bash call repeated 4 times")], notes=[]),
 dict(id="read-only-mode", group="protect", path="dev-mods/read-only-mode", tagline="Look but don't touch: explore a codebase with edits disabled.",
  what="`/readonly on` refuses every file edit and every shell command that is not clearly read-only (ls, cat, grep, git status/log/diff, find without -delete...). Redirects, command substitution and unknown commands are refused. Great for onboarding to unfamiliar code or inspecting a production checkout.",
  activate=["`/readonly on` to enable, `/readonly off` to disable, `/readonly status` to check."], options=[],
  demo=[("Enable", "> /readonly on\nRead-only mode ON: edits and mutating commands are refused."), ("Model tries to edit", "Read-only mode is on (the user ran /readonly on). Do not edit files; describe the change instead."), ("Status line", "🔒 read-only")],
  notes=["It is a guardrail on the model's tool calls, not a sandbox: it does not stop you from running commands yourself."]),
 dict(id="auto-checkpoint", group="protect", path="dev-mods/auto-checkpoint", tagline="Automatic snapshots before edits, so any change is undoable.",
  what="Snapshots files before the model edits them or runs risky shell commands. `/rewind-to` lists the checkpoints and restores one.",
  activate=["Snapshots are automatic.", "`/rewind-to list` shows checkpoints; `/rewind-to 2` restores checkpoint 2."], options=[],
  demo=[("/rewind-to list", "1  14:02  Edit src/auth.ts\n2  14:05  Edit src/auth.ts\n3  14:09  Bash git checkout -- ."), ("/rewind-to 2", "Rewound to checkpoint 2:\nrestored src/auth.ts")], notes=["Output format shown is illustrative."]),
 dict(id="context-guardian", group="protect", path="dev-mods/context-guardian", tagline="Warns before the context window fills up.",
  what="Toasts at 70% context. At 85% it also adds an instruction telling the model to wrap up the current step and run `/compact`, keeping the task, changed files, failing output, decisions and branch state.",
  activate=["Automatic once installed."], options=[],
  demo=[("At 70%", "Context is 70% full. Consider /compact or delegating."), ("At 85% (sent to the model)", "Context is nearly full (85% or more). Wrap up the current step, then run /compact.")], notes=["Toast wording is illustrative."]),
 dict(id="verify-gate", group="flow", path="dev-mods/verify-gate", tagline="Runs your tests, lint and type-check after edits, and feeds failures back.",
  what="After a turn that edited code, detects your project's fast checks (npm/pnpm/yarn/bun scripts for test, lint, typecheck; pytest, ruff, mypy/pyright via uv; `make test`) and runs them. Failures go back to the model so it fixes them, up to 3 retries. Docs, images and config edits are ignored.",
  activate=["Automatic once installed. Needs a recognisable project (package.json, pyproject.toml or Makefile)."], options=[],
  demo=[("All green", "verified"), ("Gives up", "verify-gate: still failing after 3 retries, giving up this turn")], notes=[]),
 dict(id="prompt-snippets", group="flow", path="dev-mods/prompt-snippets", tagline="Type ;review or ;tests and it expands into a full instruction.",
  what="Short `;name` shortcuts in a prompt expand to reusable instructions before Claude sees them. Ships with ;review ;tests ;plan ;explain ;short ;fix, and you can add your own.",
  activate=["Type `;name` anywhere at the start of a word in a prompt.", "`/snippets` lists everything available.", "Add your own with the `extraSnippets` option (a JSON object)."],
  options=[("extraSnippets", "(empty)", 'JSON object of name -> text, e.g. {"ship":"Run the checks, then commit and push."}')],
  demo=[("You type", "refactor the parser ;plan ;short"), ("Claude receives", "refactor the parser Before editing anything, outline a short plan: the goal, the files you will touch and how you will verify it. Then proceed. Keep the answer under 5 lines. Results first, no preamble."), ("/snippets", ";review  Review the current changes for correctness bugs, security issues and missed…\n;tests   Write focused tests for the behaviour above, run them, and report the result…\n;plan    Before editing anything, outline a short plan: the goal, the files you will touc…")], notes=["Unknown names such as `;foo` are left untouched."]),
 dict(id="session-journal", group="flow", path="dev-mods/session-journal", tagline="One command turns the session into a shareable markdown timeline.",
  what="Quietly records your prompts, shell commands run and files edited. `/journal` writes them to `.claude/journal/<date-time>.md`, grouped under each prompt with a files-changed summary. Good for handoffs, standups and PR descriptions.",
  activate=["`/journal` any time; run it again to refresh the same file."], options=[],
  demo=[("/journal", "Journal written to .claude/journal/2026-10-14-09-30.md (23 entries)."), ("The file", """# Session 2026-10-14 09:30

## 09:30 · fix the login redirect

- ran `npm test`
- edited `src/auth.ts`
- ran `npm test`

## Files changed

- `src/auth.ts` (×1)""")], notes=["Add `.claude/journal/` to .gitignore if you don't want to commit journals.", "Records are kept in memory (last 1000 entries), so a restart starts a fresh journal."]),
 dict(id="session-deck", group="sessions", path=".", tagline="See and message your other live Claude sessions.",
  what="Keeps a shared roster of your running sessions (project, model, one-line AI summary of what each is doing). `/live` opens a pane with the roster, usage bars and a small pet; `/peers` lists other sessions; `/tell` sends one a message. Also asks before risky shell commands (force-delete, force-push, publishing) and chimes after turns longer than 30s.",
  activate=["`/live` opens the pane, `/peers` lists sessions, `/tell <id-prefix> <text>` messages one.", "The risky-command prompt and the chime are automatic."], options=[],
  demo=[("/peers", "a1b2c3d4  sonnet  /work/api   fixing token refresh bug\n9f8e7d6c  opus    /work/web   reviewing checkout redesign"), ("/tell 9f8e Please rebase on main", "Sent to 9f8e7d6c"), ("Risky command prompt", "DESTRUCTIVE: force/recursive delete | run it? rm -rf src\n  [Run it]  [Refuse]")],
  notes=["Sessions only see each other on the same machine and user.", "Install name: `session-deck` (the repo root is itself a plugin)."]),
 dict(id="break-time", group="fun", path="dev-mods/break-time", tagline="A coffee-break reminder with an animated pane.",
  what="Tracks active time and, after a while, toasts and opens an animated ASCII coffee-break pane with a countdown and stretch tips.",
  activate=["Automatic reminders.", "`/break` starts a break now, `/break-skip` snoozes 15 minutes, `/break-done` resets the timer."],
  options=[("intervalMinutes", "150", "Active minutes between reminders"), ("breakMinutes", "5", "Countdown length")],
  demo=[("Toast", "Time for a coffee break. Run /break (or /break-skip to snooze).")], notes=[]),
 dict(id="arcade", group="fun", path="dev-mods/arcade", tagline="Doom-ish raycaster and Snake in a pane, for waiting on long runs.",
  what="Tiny text-mode games that run inside Claude Code. /doom is a raycaster with wandering enemies and a minimap; /snake is classic snake.",
  activate=["`/doom`: WASD/arrows move, space shoots, `q` quits.", "`/snake`: WASD/arrows steer, `r` restarts, `q` quits."], options=[],
  demo=[("/snake", "┌──────────────┐\n│              │\n│   ████►   ●  │\n│              │\n└──────────────┘  score 3")],
  notes=["Doom needs a pane of at least 40x16; 80x30 or larger looks best.", "Keys only reach a game while its pane has focus. Esc closes it.", "Key presses move in steps (terminals give no key-up), so tap rather than hold."]),
]

COMPANION = dict(name="claude-mods", repo="~/projects/claude-mods", tagline="Cost-aware agent team: tier router, swarm conductor, cost guard, notifications and output styles.",
  parts=[
   ("Agents", "`scout` (Haiku, read-only: search and triage), `builder` (Sonnet: implementation), `reviewer` (Opus, read-only: review and security), `planner`, `integrator` (merges parallel worktrees)."),
   ("Skills", "`claude-mods:route` picks the cheapest adequate model tier and delegates; `claude-mods:swarm` runs a tiered agent team with quality gates and a live board."),
   ("Commands", "`/claude-mods:tier <task>` recommends a model tier; `/claude-mods:budget` shows context, 5h usage, cost and cache warmth; `/claude-mods:swarm` runs the swarm; `/claude-mods:audit` checks whether your CLAUDE.md rules are still needed."),
   ("Hooks", "cost-guard (warns at 70% context or 80% 5h usage), notify (macOS notification after long turns), resume-recap (handoff note between sessions), cache-keeper (cache warmth for a status line)."),
   ("Output styles", "`terse` and `mentor`, selected with `/output-style`."),
  ],
  install=["claude --plugin-dir ~/projects/claude-mods", "# or keep it permanently: alias cc='claude --plugin-dir ~/projects/claude-mods'"])

def opts_md(m):
    if not m["options"]: return ""
    rows = "\n".join(f"| `{n}` | {d} | {x} |" for n, d, x in m["options"])
    return f"\n## Options\n\n| Option | Default | What it does |\n| --- | --- | --- |\n{rows}\n\nSet options when installing, or later in `/plugin` → the mod → configure.\n"

def install_block(m):
    name = m["id"]
    return f"""```
/plugin marketplace add <owner>/{REPO}
/plugin install {name}@{MARKET}
```"""

def mod_readme(m):
    demos = "\n".join(f"**{l}**\n\n```\n{t}\n```\n" for l, t in m["demo"])
    notes = "".join(f"- {n}\n" for n in m["notes"])
    act = "".join(f"- {a}\n" for a in m["activate"])
    local = f"claude --plugin-dir ./{m['path']}"
    return f"""# {m['id']}

{m['tagline']}

{m['what']}

## Install

{install_block(m)}

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `{local}`

## Use it

{act}
## What you'll see

_Illustrative output._

{demos}{opts_md(m)}{('## Notes' + chr(10) + chr(10) + notes) if notes else ''}"""

def root_readme():
    out = [f"""# Claude Mod Garage

A shelf of small, independent mods for [Claude Code](https://claude.com/claude-code). Install only the ones you want. Each has its own README with install steps and a sample of what it looks like.

**See them in action:** open `docs/index.html` in a browser for the visual walkthrough.

## Quick start

1. Add the marketplace once:
   ```
   /plugin marketplace add <owner>/{REPO}
   ```
2. Install any mod by name:
   ```
   /plugin install agent-radar@{MARKET}
   ```
3. Run `/reload-plugins` (or restart). Then use the mod's command (see tables) or just let it work.

Try one without installing: `git clone` this repo, then `claude --plugin-dir ./dev-mods/agent-radar`.

> Requires a Claude Code build that supports plugin hook modules (`hooks/hooks.json` with `"modules"`).

## Pick a mod
"""]
    for gid, gname, gdesc in GROUPS:
        out.append(f"\n### {gname}\n\n_{gdesc}_\n\n| Mod | What it does | Activate |\n| --- | --- | --- |")
        for m in [x for x in MODS if x["group"] == gid]:
            act = m["activate"][0].replace("|", "\\|")
            out.append(f"| [**{m['id']}**]({m['path'] if m['path']!='.' else '.'}/README.md) | {m['tagline']} | {act} |" if m["path"] != "." else f"| **{m['id']}** (repo root) | {m['tagline']} | {act} |")
    c = COMPANION
    out.append(f"""
## Companion plugin: {c['name']}

{c['tagline']} It is a separate plugin (Python hooks, agents, skills and commands) that lives in its own folder, `{c['repo']}`, and works well alongside these mods.

| Part | What's in it |
| --- | --- |""")
    for k, v in c["parts"]: out.append(f"| {k} | {v} |")
    out.append("\nLoad it:\n\n```\n" + "\n".join(c["install"]) + "\n```\n\nIt reads usage numbers saved by a status-line script (see its README), so cost-guard and `/claude-mods:budget` need that set up.")
    out.append(f"""
## Develop

```
claude plugin validate dev-mods/<name>
claude plugin test dev-mods/<name>
python3 scripts/gen_docs.py     # regenerate these docs from scripts/gen_docs.py
```

Each mod keeps pure logic in `lib.ts` with unit tests and the hook wiring in `register.ts(x)`. Test mods one folder at a time: running `claude plugin test` at the repo root also loads the root plugin's hooks into every nested test.

## License

MIT
""")
    return "\n".join(out)

CSS = """
:root{--bg:#0e1116;--card:#161b22;--line:#262d38;--fg:#e6edf3;--dim:#8b96a5;--acc:#58d1a3;--acc2:#7aa2f7}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{padding:56px 24px 32px;max-width:1040px;margin:auto}h1{font-size:2.4rem;margin:0 0 8px}h1 span{color:var(--acc)}
.lead{color:var(--dim);max-width:62ch}main{max-width:1040px;margin:auto;padding:0 24px 80px}
code,pre{font:13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:24px 0 8px}
.step{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}.step b{color:var(--acc)}
.term{font:13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;position:relative;background:#0a0d12;border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0;overflow-x:auto;white-space:pre-wrap;color:#cfe3d8}
.term .cap{display:block;color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.copy{position:absolute;top:8px;right:8px;background:var(--line);color:var(--fg);border:0;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer}
nav{position:sticky;top:0;z-index:5;background:rgba(14,17,22,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
nav div{max-width:1040px;margin:auto;padding:10px 24px;display:flex;gap:8px;flex-wrap:wrap}
nav button{background:var(--card);color:var(--dim);border:1px solid var(--line);border-radius:99px;padding:5px 14px;cursor:pointer;font-size:14px}
nav button.on{color:#06140e;background:var(--acc);border-color:var(--acc)}
h2{margin:44px 0 4px;font-size:1.4rem}.gd{color:var(--dim);margin:0 0 14px}
.mod{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:16px 0}
.mod h3{margin:0;font-size:1.15rem}.mod h3 code{color:var(--acc);font-size:1.1rem}.tag{color:var(--acc2);margin:2px 0 10px}
.mod p{margin:8px 0}.lbl{color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-top:14px}
ul{margin:6px 0;padding-left:20px}li{margin:3px 0}.opt{color:var(--dim);font-size:14px}
code.i{background:#0a0d12;border:1px solid var(--line);border-radius:5px;padding:1px 6px}
footer{color:var(--dim);text-align:center;padding:40px}
"""

JS = """
const btns=document.querySelectorAll('nav button');
btns.forEach(b=>b.onclick=()=>{btns.forEach(x=>x.classList.remove('on'));b.classList.add('on');
document.querySelectorAll('[data-g]').forEach(s=>s.style.display=(b.dataset.f==='all'||s.dataset.g===b.dataset.f)?'':'none')});
document.querySelectorAll('.copy').forEach(c=>c.onclick=()=>{navigator.clipboard.writeText(c.dataset.t);const o=c.textContent;c.textContent='copied';setTimeout(()=>c.textContent=o,1200)});
"""

def inline(s):
    e = html.escape(s)
    parts = e.split("`")
    return "".join(f"<code class='i'>{p}</code>" if i % 2 else p for i, p in enumerate(parts))

def term(text, cap=None, copy=False):
    btn = f"<button class='copy' data-t='{html.escape(text, quote=True)}'>copy</button>" if copy else ""
    c = f"<span class='cap'>{html.escape(cap)}</span>" if cap else ""
    return f"<div class='term'>{btn}{c}{html.escape(text)}</div>"

def page():
    nav = "<button class='on' data-f='all'>All</button>" + "".join(f"<button data-f='{g}'>{html.escape(n)}</button>" for g, n, _ in GROUPS) + "<button data-f='companion'>claude-mods</button>"
    body = []
    for gid, gname, gdesc in GROUPS:
        body.append(f"<section data-g='{gid}'><h2>{html.escape(gname)}</h2><p class='gd'>{html.escape(gdesc)}</p>")
        for m in [x for x in MODS if x["group"] == gid]:
            act = "".join(f"<li>{inline(a)}</li>" for a in m["activate"])
            opts = "".join(f"<li><code class='i'>{html.escape(n)}</code> <span class='opt'>(default {html.escape(d)}) {html.escape(x)}</span></li>" for n, d, x in m["options"])
            demos = "".join(term(t, l) for l, t in m["demo"])
            notes = "".join(f"<li>{inline(n)}</li>" for n in m["notes"])
            body.append(f"""<article class='mod'><h3><code>{m['id']}</code></h3><div class='tag'>{html.escape(m['tagline'])}</div><p>{inline(m['what'])}</p>
<div class='lbl'>Install</div>{term(f"/plugin install {m['id']}@{MARKET}", None, True)}
<div class='lbl'>Activate</div><ul>{act}</ul>
<div class='lbl'>What you'll see (illustrative)</div>{demos}
{('<div class="lbl">Options</div><ul>' + opts + '</ul>') if opts else ''}{('<div class="lbl">Notes</div><ul>' + notes + '</ul>') if notes else ''}</article>""")
        body.append("</section>")
    c = COMPANION
    parts = "".join(f"<li><b>{html.escape(k)}</b>: {inline(v)}</li>" for k, v in c["parts"])
    body.append(f"""<section data-g='companion'><h2>Companion plugin: {c['name']}</h2><p class='gd'>{html.escape(c['tagline'])}</p>
<article class='mod'><ul>{parts}</ul><div class='lbl'>Load it</div>{term(chr(10).join(c['install']), None, True)}</article></section>""")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude Mod Garage</title><style>{CSS}</style></head><body>
<header><h1>Claude Mod <span>Garage</span></h1><p class="lead">Small, independent mods for Claude Code. Pick what you need, install in two commands, and see exactly what each one does before you do.</p>
<div class="steps"><div class="step"><b>1</b> Add the marketplace (once){term(f"/plugin marketplace add <owner>/{REPO}", None, True)}</div>
<div class="step"><b>2</b> Install a mod{term(f"/plugin install agent-radar@{MARKET}", None, True)}</div>
<div class="step"><b>3</b> Reload and use it{term("/reload-plugins", None, True)}</div></div></header>
<nav><div>{nav}</div></nav><main>{''.join(body)}</main><footer>MIT licensed · Output samples are illustrative</footer><script>{JS}</script></body></html>"""

def main():
    (ROOT / "README.md").write_text(root_readme())
    for m in MODS:
        (ROOT / m["path"] / "README.md").write_text(mod_readme(m))
    (ROOT / "docs").mkdir(exist_ok=True)
    (ROOT / "docs" / "index.html").write_text(page())
    # marketplace files
    plugins = [{"name": m["id"], "source": "./" + m["path"] if m["path"] != "." else "./", "description": m["tagline"]} for m in MODS]
    (ROOT / ".claude-plugin" / "marketplace.json").write_text(json.dumps({"name": MARKET, "owner": {"name": "Robin Saini"}, "plugins": plugins}, indent=2) + "\n")
    local = [{"name": m["id"], "source": "./" + m["path"].removeprefix("dev-mods/"), "description": m["tagline"]} for m in MODS if m["path"] != "."]
    (ROOT / "dev-mods" / ".claude-plugin" / "marketplace.json").write_text(json.dumps({"name": "robin-dev-mods", "owner": {"name": "robin"}, "plugins": local}, indent=2) + "\n")
    print("generated", len(MODS), "mods")

main()
