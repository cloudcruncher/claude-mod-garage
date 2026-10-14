// Pure pattern logic for secret-guard.

const EXAMPLE_SUFFIX = /\.(example|sample|template|dist|defaults?)$/i

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/** Returns why a path is a secret file, or undefined when it is fine to write. */
export function secretPathReason(path: string): string | undefined {
  const name = baseName(path)
  const lower = name.toLowerCase()
  if (EXAMPLE_SUFFIX.test(lower)) return undefined
  if (lower === '.env' || lower.startsWith('.env.')) return `${name} is an environment file that usually holds secrets`
  if (lower.endsWith('.pem')) return `${name} is a PEM key or certificate file`
  if (/\.(p12|pfx|jks|keystore)$/.test(lower)) return `${name} is a key store`
  if (/^id_[a-z0-9_]+$/.test(lower)) return `${name} looks like an SSH private key`
  if (/^(\.?credentials|\.git-credentials)(\..*)?$/.test(lower) || lower === 'credentials.json') {
    return `${name} is a credentials file`
  }
  return undefined
}

export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0
  const counts = new Map<string, number>()
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  let h = 0
  for (const c of counts.values()) {
    const p = c / s.length
    h -= p * Math.log2(p)
  }
  return h
}

const FIXED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'AWS access key id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { label: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { label: 'Anthropic API key', re: /\bsk-ant-[A-Za-z0-9_-]{16,}/ },
  { label: 'API secret key (sk-)', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
  { label: 'private key block', re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY(?: BLOCK)?-----/ },
  { label: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
]

const ASSIGNMENT =
  /\b[\w.-]*(?:secret|token|passw(?:or)?d|api[_-]?key|access[_-]?key|private[_-]?key|auth)[\w.-]*\s*[:=]\s*["']?([A-Za-z0-9+/_\-=.]{20,})["']?/i

const PLACEHOLDER = /(example|placeholder|changeme|your[_-]|<.*>|xxxx|\$\{|\$\(|process\.env|dummy|redacted)/i

/** Returns a label for the first secret-looking thing in the text, or undefined. */
export function findSecret(text: string): string | undefined {
  for (const { label, re } of FIXED_PATTERNS) if (re.test(text)) return label
  for (const line of text.split('\n')) {
    const m = ASSIGNMENT.exec(line)
    const value = m?.[1]
    if (value === undefined) continue
    if (PLACEHOLDER.test(line)) continue
    if (shannonEntropy(value) >= 3.8) return 'high-entropy token in an assignment'
  }
  return undefined
}

/** The added lines of a unified diff, without the leading plus. */
export function addedLines(diff: string): string {
  return diff
    .split('\n')
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1))
    .join('\n')
}

export type GitOp = { kind: 'commit' | 'add' | 'push'; args: string[] }

/** Same-length copy with heredoc bodies and quoted text blanked, so words inside them are not read as commands. */
function maskLiterals(command: string): string {
  const blank = (t: string): string => t.replace(/[^\n]/g, '_')
  return command
    .replace(/(<<-?\s*(["']?)(\w+)\2[^\n]*\n)([\s\S]*?)(\n\s*\3(?=\n|$))/g, (_m, head: string, _q, _id, body: string, tail: string) => head + blank(body) + tail)
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, m => m[0] + blank(m.slice(1, -1)) + m[m.length - 1])
}

/** Finds git commit/add/push invocations in a shell command line. */
export function gitOps(command: string): GitOp[] {
  const ops: GitOp[] = []
  const masked = maskLiterals(command)
  let offset = 0
  for (const segment of masked.split(/&&|\|\||;|\n/)) {
    const start = masked.indexOf(segment, offset)
    offset = start + segment.length
    // git must be the command itself, not a word inside an argument
    const m = /^\s*(?:\w+=\S*\s+)*git\s+(?:-C\s+\S+\s+|-c\s+\S+\s+)*(commit|add|push)\b(.*)$/s.exec(segment)
    if (!m) continue
    const rest = command.slice(start + segment.length - (m[2] ?? '').length, start + segment.length)
    const args = rest.match(/"[^"]*"|'[^']*'|\S+/g) ?? []
    ops.push({ kind: m[1] as GitOp['kind'], args: args.map(a => a.replace(/^["']|["']$/g, '')) })
  }
  return ops
}

const PROTECTED_BRANCH = /^(?:main|master)$/

/** Returns a deny reason for a git push, or undefined when it is allowed. */
export function pushDenyReason(args: string[], currentBranch?: string): string | undefined {
  const isForce = args.some(
    a => a === '-f' || /^--force(?:-with-lease|-if-includes)?(?:=.*)?$/.test(a) || /^\+\S/.test(a) ||
      (/^-[a-zA-Z]+$/.test(a) && a.includes('f')),
  )
  if (isForce) return 'force pushes are not allowed here; push normally or ask the user to do it'
  const positional = args.filter(a => !a.startsWith('-'))
  const refspecs = positional.slice(1) // first positional is the remote
  const targets = refspecs.map(r => (r.includes(':') ? (r.split(':').pop() ?? '') : r))
  if (targets.some(t => PROTECTED_BRANCH.test(t.replace(/^refs\/heads\//, '')))) {
    return 'pushing to main or master is blocked; push a branch and open a pull request'
  }
  if (refspecs.length === 0 && currentBranch !== undefined && PROTECTED_BRANCH.test(currentBranch)) {
    return `you are on ${currentBranch}; pushing to main or master is blocked`
  }
  if (args.includes('--all') || args.includes('--mirror')) {
    return 'pushing all refs would include main or master; push a named branch instead'
  }
  return undefined
}

/** True when a `git add` or `git commit` could pick up files beyond those it names. */
export function isBroadStage(op: GitOp): boolean {
  if (op.kind === 'commit') {
    return op.args.some(a => a === '-a' || a === '--all' || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(a))
  }
  return op.args.some(a => ['.', '-A', '--all', '-u', '--update', ':/'].includes(a))
}
