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

export const DEFAULT_MAX_REPEATS = 3
export const DEFAULT_ALLOWLIST = 'TaskOutput,BashOutput,gh run view,git status'

/** A positive whole number, else the default. Settings can hand over strings, floats or junk. */
export function parseMaxRepeats(v: unknown, fallback = DEFAULT_MAX_REPEATS): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : fallback
}

/** Splits the comma-separated allowlist setting into trimmed, non-empty entries. */
export function parseAllowlist(v: unknown): string[] {
  return (typeof v === 'string' ? v : DEFAULT_ALLOWLIST).split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * True when polling this call is expected: an entry equals the tool name
 * (TaskOutput) or is a prefix of the Bash command (gh run view).
 */
export function isAllowed(tool: string, command: unknown, allowlist: string[]): boolean {
  const cmd = typeof command === 'string' ? command.trim() : ''
  return allowlist.some(a => a === tool || (tool === 'Bash' && (cmd === a || cmd.startsWith(`${a} `))))
}
