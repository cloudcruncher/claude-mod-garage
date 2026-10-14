export const DEFAULTS: Record<string, string> = {
  review: 'Review the current changes for correctness bugs, security issues and missed edge cases. Report findings most severe first, each with file and line.',
  tests: 'Write focused tests for the behaviour above, run them, and report the result honestly. Do not change production code unless a test exposes a real bug.',
  plan: 'Before editing anything, outline a short plan: the goal, the files you will touch and how you will verify it. Then proceed.',
  explain: 'Explain this simply: what it does, why it is built this way, and one thing that could trip me up.',
  short: 'Keep the answer under 5 lines. Results first, no preamble.',
  fix: 'Find the root cause before changing anything. Show the evidence, make the smallest fix, and verify it with a command.',
}

/** Parses the extraSnippets option; a bad value is ignored so the defaults still work. */
export function parseExtra(raw: unknown): Record<string, string> {
  if (typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const obj = JSON.parse(raw)
    const out: Record<string, string> = {}
    if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) if (typeof v === 'string' && /^[\w-]+$/.test(k)) out[k] = v
    return out
  } catch { return {} }
}

/** Replaces `;name` (at a word start) with its snippet text; unknown names are left alone. */
export function expand(text: string, snippets: Record<string, string>): string {
  return text.replace(/(^|\s);([\w-]+)\b/g, (m, lead: string, name: string) =>
    Object.prototype.hasOwnProperty.call(snippets, name) ? lead + snippets[name] : m)
}
