# loop-breaker

If the model runs the exact same tool call (same tool, same arguments) more than `maxRepeats` times in a row (default 3), the next one is refused with a message telling it to change approach, and you get a toast. Each subagent is judged on its own calls. Fails open: if the hook errors, calls run normally.
