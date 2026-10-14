export type Call = {
  id: string
  agentId?: string
  tool: string
  label: string
  start: number
  end?: number
  isError?: boolean
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

export function finish(list: Call[], id: string, end: number, isError?: boolean): Call[] {
  return list.map(c => (c.id === id ? { ...c, end, isError } : c))
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
