# secret-guard

Stops secrets being written, committed or pushed.

Refuses to write `.env`, `.pem`, SSH keys and credentials files, refuses to write file content that looks like an API key or token, refuses commands that contain API keys or high-entropy tokens, blocks `git add`/`commit` of staged secrets, and blocks force pushes and (by default) pushes to main/master. Git commands are checked in the directory they run in, including `cd <dir> &&` and `git -C <dir>`. `.env.example`-style files are allowed.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install secret-guard@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/secret-guard`

## Use it

- Automatic once installed.

## What you'll see

_Illustrative output._

**Model tries to write .env**

```
secret-guard: refusing to write .env. .env is an environment file that usually holds secrets. Use a .env.example with placeholder values, or ask the user to edit it.
```

**Model tries to push**

```
secret-guard: git push blocked: pushing to main is not allowed.
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `blockMainPush` | on | Refuse every git push to main or master (force pushes are always refused) |

Set options when installing, or later in `/plugin` → the mod → configure.
## Notes

- Fails closed: if the guard itself errors, the write or git command is blocked.
