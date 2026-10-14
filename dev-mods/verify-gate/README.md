# verify-gate

Runs your tests, lint and type-check after edits, and feeds failures back.

After a turn that edited code, detects your project's fast checks (npm/pnpm/yarn/bun scripts for test, lint, typecheck; pytest, ruff, mypy/pyright via uv; `make test`) and runs them. Failures go back to the model so it fixes them, up to 3 retries. Docs, images and config edits are ignored.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install verify-gate@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/verify-gate`

## Use it

- Automatic once installed. Needs a recognisable project (package.json, pyproject.toml or Makefile).

## What you'll see

_Illustrative output._

**All green**

```
verified
```

**Gives up**

```
verify-gate: still failing after 3 retries, giving up this turn
```
