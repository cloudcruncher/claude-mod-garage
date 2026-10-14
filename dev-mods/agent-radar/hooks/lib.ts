export type Call = {
  id: string
  agentId?: string
  tool: string
  label: string
  start: number
  end?: number
  isError?: boolean
  /** First line of what the tool returned, once it finished. */
  out?: string
}

const MAX_CALLS = 300
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

const base = (p: unknown) => String(p ?? '').split('/').filter(Boolean).slice(-2).join('/')
const oneLine = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

/** One short human line for a tool call: what it is acting on. */
export function label(tool: string, e: Record<string, unknown>): string {
  switch (tool) {
    case 'Bash': return oneLine(e.command, 70)
    case 'Read': case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit':
      return base(e.file_path ?? e.notebook_path)
    case 'Grep': case 'Glob': return oneLine(e.pattern, 60)
    case 'Agent': return oneLine(e.description ?? e.prompt, 60)
    case 'WebFetch': return oneLine(e.url, 60)
    case 'WebSearch': return oneLine(e.query, 60)
    default: return ''
  }
}

export function start(list: Call[], call: Call): Call[] {
  return [...list, call].slice(-MAX_CALLS)
}

export function finish(list: Call[], id: string, end: number, isError?: boolean, out?: string): Call[] {
  return list.map(c => (c.id === id ? { ...c, end, isError, out } : c))
}

/** One line of a tool's output for a row: the first, or for a failure the last (where the error message is). */
export function preview(text: unknown, n = 90, fromEnd = false): string {
  const lines = String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean)
  const line = (fromEnd ? lines[lines.length - 1] : lines[0]) ?? ''
  return line.length > n ? line.slice(0, n - 1) + '…' : line
}

/** The visible text of an assistant row: its text blocks only (nothing else is read). */
export function sayText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter((b): b is { type: 'text'; text: string } => !!b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function clip(text: string, n: number): string {
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

/** The newest n calls made inside one loop, oldest first. */
export function lastCalls(list: Call[], agentId: string | undefined, n: number): Call[] {
  return list.filter(c => c.agentId === agentId).slice(-n)
}

export function running(list: Call[]): Call[] {
  return list.filter(c => c.end === undefined)
}

/** Files written by edit tools, most-touched first. */
export function filesTouched(list: Call[]): { path: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of list) {
    if (EDIT_TOOLS.has(c.tool) && c.label) counts.set(c.label, (counts.get(c.label) ?? 0) + 1)
  }
  return [...counts].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count)
}

/** The newest call made inside a given agent's loop (or the main loop when undefined). */
export function latestFor(list: Call[], agentId?: string): Call | undefined {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].agentId === agentId) return list[i]
  return undefined
}

export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}
