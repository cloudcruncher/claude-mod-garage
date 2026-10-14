// Arguments that vary between otherwise identical calls (the model rewrites a Bash
// description each time) and so must not count when comparing.
const NOISE = new Set(['tool', 'tool_use_id', 'agentId', 'requestMeta', 'description', 'timeout', 'run_in_background'])

/** A stable signature for a tool call: the tool plus its arguments, minus ids and free-text labels. */
export function signature(tool: string, args: Record<string, unknown>): string {
  const rest: Record<string, unknown> = {}
  for (const k of Object.keys(args)) if (!NOISE.has(k)) rest[k] = args[k]
  const sorted = Object.keys(rest).sort().map(k => [k, rest[k]])
  return tool + ':' + JSON.stringify(sorted)
}

/** How many identical signatures end the history (the streak the next call would extend). */
export function streak(history: string[], sig: string): number {
  let n = 0
  for (let i = history.length - 1; i >= 0 && history[i] === sig; i--) n++
  return n
}

export function shouldBlock(history: string[], sig: string, maxRepeats: number): boolean {
  return streak(history, sig) >= maxRepeats
}
