# secret-guard

Stops secrets being written, committed or pushed.

Refuses to write `.env`, `.pem`, SSH keys and credentials files, refuses commands that contain API keys or high-entropy tokens, blocks `git add`/`commit` of staged secrets, and blocks pushes to main/master and force pushes. `.env.example`-style files are allowed.

## Install

```
/plugin marketplace add <owner>/claude-mod-garage
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
## Notes

- Fails closed: if the guard itself errors, the write or git command is blocked.
