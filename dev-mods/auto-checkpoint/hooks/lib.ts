// Pure helpers for auto-checkpoint: target extraction, manifest, pruning, listing.

export const MAX_CHECKPOINTS = 200

export type ManifestEntry = {
  path: string
  existed: boolean
  /** name of the copy inside the checkpoint folder (files/<stored>), when existed */
  stored?: string
}

export type Manifest = {
  version: 1
  createdAt: number
  tool: string
  entries: ManifestEntry[]
}

export type CheckpointRef = { session: string; id: string }

const FILE_TOOLS: Record<string, string> = {
  Edit: 'file_path',
  Write: 'file_path',
  MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
}

/** Paths a file-editing tool call is about to change. */
export function filePathsFor(tool: string, input: Record<string, unknown>): string[] {
  const key = FILE_TOOLS[tool]
  if (key === undefined) return []
  const v = input[key]
  return typeof v === 'string' && v !== '' ? [v] : []
}

export type RiskyBash = { paths: string[]; wholeTree: boolean }

function splitWords(s: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '')
  return out
}

/**
 * Says which paths a shell command may destroy. `wholeTree` means the tracked
 * changes of the repo are at risk (git reset --hard, git checkout -- .).
 * Returns undefined when the command is not risky.
 */
export function riskyBash(command: string): RiskyBash | undefined {
  const paths: string[] = []
  let wholeTree = false
  let risky = false
  for (const segment of command.split(/&&|\|\||;|\|/)) {
    const words = splitWords(segment.trim())
    while (words[0] === 'sudo' || words[0] === 'command' || /^\w+=/.test(words[0] ?? '')) words.shift()
    const cmd = words[0]
    const args = words.slice(1)
    if (cmd === 'rm' || cmd === 'mv') {
      risky = true
      paths.push(...args.filter(a => !a.startsWith('-') && !/[*?]/.test(a)))
    } else if (cmd === 'git' && args[0] === 'reset' && args.includes('--hard')) {
      risky = true
      wholeTree = true
    } else if (cmd === 'git' && args[0] === 'checkout' && args.includes('--')) {
      risky = true
      const rest = args.slice(args.indexOf('--') + 1)
      if (rest.length === 0 || rest.includes('.')) wholeTree = true
      else paths.push(...rest)
    } else if (cmd === 'git' && (args[0] === 'clean' || args[0] === 'restore')) {
      risky = true
      if (args[0] === 'restore') wholeTree = true
    }
  }
  return risky ? { paths: [...new Set(paths)], wholeTree } : undefined
}

/** Resolves a path against cwd without touching the file system. */
export function absolutePath(p: string, cwd: string, home: string): string {
  let full = p
  if (full === '~') full = home
  else if (full.startsWith('~/')) full = `${home}/${full.slice(2)}`
  else if (!full.startsWith('/')) full = `${cwd.replace(/\/$/, '')}/${full}`
  const parts: string[] = []
  for (const seg of full.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  return `/${parts.join('/')}`
}

/** Sortable checkpoint id: zero-padded epoch milliseconds plus a sequence tail. */
export function checkpointId(nowMs: number, seq = 0): string {
  return `${String(nowMs).padStart(15, '0')}-${String(seq).padStart(3, '0')}`
}

export function buildManifest(
  tool: string,
  nowMs: number,
  items: { path: string; existed: boolean }[],
): Manifest {
  return {
    version: 1,
    createdAt: nowMs,
    tool,
    entries: items.map((it, i) => ({
      path: it.path,
      existed: it.existed,
      ...(it.existed ? { stored: String(i) } : {}),
    })),
  }
}

/** Newest first. */
export function sortNewestFirst(refs: CheckpointRef[]): CheckpointRef[] {
  return [...refs].sort((a, b) =>
    a.id !== b.id ? (a.id < b.id ? 1 : -1) : a.session < b.session ? 1 : a.session > b.session ? -1 : 0,
  )
}

/** Checkpoints to delete so only the newest `keep` remain, across sessions. */
export function pruneList(refs: CheckpointRef[], keep = MAX_CHECKPOINTS): CheckpointRef[] {
  return sortNewestFirst(refs).slice(keep)
}

/** Resolves `/rewind-to` arguments against a newest-first list of `count`. */
export function resolveSelection(arg: string, count: number): number | 'list' | 'invalid' {
  const a = arg.trim().toLowerCase()
  if (a === '') return 'list'
  if (a === 'last') return count > 0 ? 0 : 'invalid'
  if (!/^\d+$/.test(a)) return 'invalid'
  const n = Number(a)
  return n >= 1 && n <= count ? n - 1 : 'invalid'
}

export function formatListing(items: { id: string; manifest: Manifest }[]): string {
  if (items.length === 0) return 'No checkpoints in this session yet.'
  const lines = items.map((it, i) => {
    const when = new Date(it.manifest.createdAt).toISOString().replace('T', ' ').slice(0, 19)
    const names = it.manifest.entries.map(e => e.path.split('/').pop() ?? e.path)
    const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? `, +${names.length - 3} more` : '')
    return `${String(i + 1).padStart(3)}. ${when}Z  ${it.manifest.tool}  ${shown}`
  })
  return `Checkpoints (newest first). Restore with /rewind-to <n> or /rewind-to last.\n${lines.join('\n')}`
}

export function parseManifest(text: string): Manifest | undefined {
  try {
    const m = JSON.parse(text) as Manifest
    return m && m.version === 1 && Array.isArray(m.entries) ? m : undefined
  } catch {
    return undefined
  }
}
