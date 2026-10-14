const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

export type Tally = { tools: number; files: Set<string> }

export const fresh = (): Tally => ({ tools: 0, files: new Set() })

export function record(t: Tally, tool: string, args: Record<string, unknown>): void {
  t.tools++
  const path = args.file_path ?? args.notebook_path
  if (EDIT_TOOLS.has(tool) && typeof path === 'string') t.files.add(path)
}

export function dur(ms: number): string {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

/** The recap line, or undefined when the turn was too short or did nothing. */
export function recap(t: Tally, ms: number, minSeconds: number): string | undefined {
  if (ms < minSeconds * 1000 || t.tools === 0) return undefined
  const f = t.files.size
  return `Turn done in ${dur(ms)} · ${t.tools} tool call${t.tools === 1 ? '' : 's'}` + (f ? ` · ${f} file${f === 1 ? '' : 's'} edited` : '')
}
