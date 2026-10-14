/** A stable signature for a tool call: the tool plus its arguments, minus ids. */
export function signature(tool: string, args: Record<string, unknown>): string {
  const { tool_use_id: _a, agentId: _b, requestMeta: _c, ...rest } = args
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
