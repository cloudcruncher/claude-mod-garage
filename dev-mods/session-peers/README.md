# session-peers

Always-on band listing every other open Claude Code session.

Reads the session registry in `~/.claude/sessions/`, drops entries whose process has exited, and shows one dim line per live session above the prompt, newest first, refreshed every 5 seconds:

```
robin-mods-50 (ref b79115, interactive, idle, started a minute ago)
demo-35 (ref 579855, interactive, busy, started 12 minutes ago) · this one
```

The band only appears when at least two sessions are open. `ref` is the first 6 characters of the session id; use the name with `SendMessage` to reach a session.

## Install

```
/plugin install session-peers@mod-garage
```

Run `/reload-plugins` afterwards. Local try-out: `claude --plugin-dir ./dev-mods/session-peers`
