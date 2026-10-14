export type GitInfo = { branch: string; changed: number; ahead: number; behind: number }

/** Parses `git status --porcelain=v1 -b` output. */
export function parse(out: string): GitInfo | undefined {
  const lines = out.split('\n').filter(Boolean)
  const head = lines[0]
  if (!head || !head.startsWith('## ')) return undefined
  const m = head.slice(3).match(/^(?:No commits yet on |Initial commit on )?([^\s.]+(?:\.[^\s.]+)*?)(?:\.\.\.\S+)?(?: \[(.*)\])?$/)
  const branch = m?.[1] ?? head.slice(3)
  const flags = m?.[2] ?? ''
  return {
    branch,
    changed: lines.length - 1,
    ahead: Number(flags.match(/ahead (\d+)/)?.[1] ?? 0),
    behind: Number(flags.match(/behind (\d+)/)?.[1] ?? 0),
  }
}

export function format(g: GitInfo): string {
  return `⎇ ${g.branch}` + (g.changed ? ` ● ${g.changed} changed` : ' ✓ clean') + (g.ahead ? ` ↑${g.ahead}` : '') + (g.behind ? ` ↓${g.behind}` : '')
}
