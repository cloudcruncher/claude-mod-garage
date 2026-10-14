# loop-breaker

Cuts off a model that keeps repeating the same tool call.

If the same tool is called with identical arguments more than N times in a row, the next call is refused with a message telling the model to change approach, and you get a toast. Each subagent is judged on its own calls. If the hook errors it fails open.

## Install

```
/plugin marketplace add cloudcruncher/claude-mod-garage
/plugin install loop-breaker@mod-garage
```

Run `/reload-plugins` (or restart Claude Code) afterwards. To try it from a local clone without installing: `claude --plugin-dir ./dev-mods/loop-breaker`

## Use it

- Automatic once installed.

## What you'll see

_Illustrative output._

**Fourth identical call**

```
This exact Bash call has already run 3 times in a row with the same arguments. Repeating it will not change the result. Re-read the output, change the arguments, or try a different approach.
```

**Toast**

```
loop-breaker: refused a Bash call repeated 4 times
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `maxRepeats` | 3 | Identical calls allowed in a row |

Set options when installing, or later in `/plugin` → the mod → configure.
