# robin-mods

Small, self-contained mods for [Claude Code](https://claude.com/claude-code). Each one is an independent plugin: install only what you want.

## Install

```
/plugin marketplace add <owner>/robin-mods
/plugin install agent-radar@robin-mods
```

Swap `agent-radar` for any name below. Run `/reload-plugins` (or restart) if the mod does not appear. To try a mod from a local clone without installing: `claude --plugin-dir ./dev-mods/<name>`.

Mods run in the Claude Code mod engine; you need a build that supports plugin hooks modules (`hooks/hooks.json` with `"modules"`).

## Which mod do I want?

### See what is happening
| Mod | Use it for | Activate |
| --- | --- | --- |
| **agent-radar** | A live side pane of running tools, subagents, recent activity and files touched, so you can watch parallel agents work. | `/radar` (option `autoOpen` to open at start) |
| **turn-recap** | Toast after long turns: duration, tool calls, files edited. | Automatic (option `minSeconds`) |
| **cost-router** | Status line with 5h usage and context %, toasts at 70/85% usage, cheaper model for subagents with no model set. | Automatic |

### Stay safe
| Mod | Use it for | Activate |
| --- | --- | --- |
| **secret-guard** | Blocks writing secret files, committing secrets, pushing to main, force pushes. | Automatic |
| **loop-breaker** | Stops the model repeating the same tool call forever. | Automatic (option `maxRepeats`) |
| **auto-checkpoint** | Snapshots files before edits and risky commands so you can undo. | Automatic; `/rewind-to` restores |
| **context-guardian** | Warns at 70% context; at 85% tells the model to wrap up and `/compact` with keep-rules. | Automatic |

### Quality
| Mod | Use it for | Activate |
| --- | --- | --- |
| **verify-gate** | After a turn that edited code, runs the project's fast checks (tests, lint, types; detected from package.json, pyproject, Makefile) and sends failures back to the model, up to 3 retries. | Automatic |

### Wellbeing and fun
| Mod | Use it for | Activate |
| --- | --- | --- |
| **break-time** | Tracks active time and opens an animated coffee-break pane. | Automatic; `/break`, `/break-skip`, `/break-done` (options `intervalMinutes`, `breakMinutes`) |
| **arcade** | Tiny games for waiting on long runs. | `/doom`, `/snake` |

### Multi-session
| Mod | Use it for | Activate |
| --- | --- | --- |
| **robin-mods** (repo root) | See and message your other live sessions, confirm risky shell commands, chime after long turns, status pet. | `/live`, `/peers`, `/tell <id> <text>` |

## Develop

```
claude plugin validate dev-mods/<name>
claude plugin test dev-mods/<name>
```

Each mod keeps pure logic in `lib.ts` with unit tests and the hook wiring in `register.ts(x)`.

## License

MIT
