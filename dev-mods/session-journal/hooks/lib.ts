export type Entry =
  | { kind: 'prompt'; at: number; text: string }
  | { kind: 'bash'; at: number; text: string }
  | { kind: 'edit'; at: number; text: string }

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const MAX_ENTRIES = 1000

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

/** Turns a tool call into a journal entry, or undefined if it is not worth recording. */
export function fromTool(tool: string, args: Record<string, unknown>, at: number): Entry | undefined {
  if (tool === 'Bash' && typeof args.command === 'string') return { kind: 'bash', at, text: clip(args.command, 200) }
  const path = args.file_path ?? args.notebook_path
  if (EDIT_TOOLS.has(tool) && typeof path === 'string') return { kind: 'edit', at, text: path }
  return undefined
}

export function add(list: Entry[], entry: Entry): Entry[] {
  return [...list, entry].slice(-MAX_ENTRIES)
}

const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16)

export function render(entries: Entry[], title: string): string {
  const lines = [`# ${title}`, '']
  const files = new Map<string, number>()
  for (const e of entries) {
    if (e.kind === 'prompt') lines.push('', `## ${hhmm(e.at)} · ${clip(e.text, 120)}`, '')
    else if (e.kind === 'bash') lines.push(`- ran \`${e.text.replace(/`/g, "'")}\``)
    else { lines.push(`- edited \`${e.text}\``); files.set(e.text, (files.get(e.text) ?? 0) + 1) }
  }
  if (files.size) {
    lines.push('', '## Files changed', '')
    for (const [f, n] of files) lines.push(`- \`${f}\`${n > 1 ? ` (×${n})` : ''}`)
  }
  return lines.join('\n') + '\n'
}
