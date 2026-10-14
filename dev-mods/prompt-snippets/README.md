# prompt-snippets

Type ;review or ;tests and it expands into a full instruction.

Short `;name` shortcuts in a prompt expand to reusable instructions before Claude sees them. Ships with ;review ;tests ;plan ;explain ;short ;fix, and you can add your own.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install prompt-snippets@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/prompt-snippets`

## Use it

- Type `;name` anywhere at the start of a word in a prompt.
- `/snippets` lists everything available.
- Add your own with the `extraSnippets` option (a JSON object).

## What you'll see

_Illustrative output._

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

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `extraSnippets` | (empty) | JSON object of name -> text, e.g. {"ship":"Run the checks, then commit and push."} |

Set options when installing, or later in `/plugin` → the mod → configure.
## Notes

- Unknown names such as `;foo` are left untouched.
