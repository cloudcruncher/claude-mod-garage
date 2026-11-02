import type { Register, EngineInterface } from 'claude-code'
import {
  addedLines, findSecret, gitOps, isBroadStage, pushDenyReason, secretPathReason, type GitOp,
} from './lib.ts'

type Engine = EngineInterface

/** Runs git where the command would: the session cwd, then any `cd <dir>` / `git -C <dir>` of the command. */
async function git($: Engine, args: string[], dirs: string[] = []): Promise<string> {
  const cwd = await $.session.cwd().catch(() => undefined)
  const home = (await $.env.get('HOME').catch(() => undefined)) ?? ''
  // the shell expands a leading ~ before git sees it; process.run does not
  const real = dirs.map(d => (d === '~' ? home : d.startsWith('~/') ? `${home}/${d.slice(2)}` : d))
  const r = await $.process.run(['git', ...real.flatMap(d => ['-C', d]), ...args], { cwd, timeoutMs: 15000 })
  if (r.exitCode === 0) return r.stdout
  // a directory we were told to use but git cannot open (e.g. `cd $REPO`, `cd -`): fail closed rather than scan nothing
  if (dirs.length) throw new Error(`git could not run in ${real.join(' -> ')}`)
  return ''
}

/** The text a Write, Edit, MultiEdit or NotebookEdit call would put into a file. */
function writtenText(input: Record<string, unknown>): string {
  const edits = Array.isArray(input.edits) ? (input.edits as { new_string?: unknown }[]).map(x => x.new_string) : []
  return [input.content, input.new_string, input.new_source, ...edits].filter((v): v is string => typeof v === 'string').join('\n')
}

/** Looks at what a git add or commit would record; returns a deny reason or undefined. */
async function stagedProblem($: Engine, op: GitOp): Promise<string | undefined> {
  const chunks: string[] = []
  const dirs = op.dirs ?? []
  if (op.kind === 'commit') {
    chunks.push(addedLines(await git($, ['diff', '--cached', '--no-color'], dirs)))
    if (isBroadStage(op)) chunks.push(addedLines(await git($, ['diff', '--no-color'], dirs)))
  } else {
    // git add: scan the working tree changes it could pick up
    chunks.push(addedLines(await git($, ['diff', '--no-color'], dirs)))
    const status = await git($, ['status', '--porcelain', '--untracked-files=all'], dirs)
    const files = status.split('\n').filter(l => l.length > 3).map(l => l.slice(3).replace(/^"|"$/g, ''))
    const named = op.args.filter(a => !a.startsWith('-'))
    const wanted = isBroadStage(op) ? files : files.filter(f => named.some(n => f === n || f.startsWith(`${n.replace(/\/$/, '')}/`)))
    for (const f of wanted.slice(0, 50)) {
      const why = secretPathReason(f)
      if (why) return `git add would stage ${f}: ${why}`
      if (status.includes(`?? ${f}`)) {
        const text = await $.fs.read(f).catch(() => '')
        if (typeof text === 'string') chunks.push(text)
      }
    }
    const stagedNames = (await git($, ['diff', '--cached', '--name-only'], dirs)).split('\n').filter(Boolean)
    for (const f of stagedNames) {
      const why = secretPathReason(f)
      if (why) return `${f} is already staged: ${why}`
    }
  }
  const hit = findSecret(chunks.join('\n'))
  return hit ? `content to be recorded looks like a secret (${hit})` : undefined
}

export const register: Register = (on, options) => {
  const blockMainPush = options?.blockMainPush !== false
  for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'] as const) {
    on('tool.call', { tool }, ($, e, next) => {
      const path = tool === 'NotebookEdit' ? (e as { notebook_path?: string }).notebook_path : (e as { file_path?: string }).file_path
      const why = path ? secretPathReason(path) : undefined
      if (why) {
        return { deny: `secret-guard: refusing to write ${path}. ${why}. Use a .env.example with placeholder values, or ask the user to edit it.` }
      }
      const hit = findSecret(writtenText(e as unknown as Record<string, unknown>))
      return hit
        ? { deny: `secret-guard: the content being written to ${path ?? 'a file'} looks like a secret (${hit}). Use an environment variable or a placeholder instead.` }
        : next(e)
    }).catch(($, e, next) => (next.called ? next(e) : { deny: 'secret-guard: the guard failed, so the write was blocked.' }))
  }

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ops = gitOps(e.command)
    if (ops.length === 0) return next(e)

    const inline = findSecret(e.command)
    if (inline && ops.some(o => o.kind !== 'push')) {
      return { deny: `secret-guard: the command itself contains what looks like a secret (${inline}). Remove it and use an environment variable.` }
    }
    for (const op of ops) {
      if (op.kind === 'push') {
        const branch = (await git($, ['rev-parse', '--abbrev-ref', 'HEAD'], op.dirs)).trim() || undefined
        const why = pushDenyReason(op.args, branch, blockMainPush)
        if (why) return { deny: `secret-guard: git push blocked: ${why}.` }
      } else {
        const why = await stagedProblem($, op)
        if (why) return { deny: `secret-guard: git ${op.kind} blocked: ${why}. Remove the secret, rotate it if it was ever real, and retry.` }
      }
    }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'secret-guard: the guard failed, so the git command was blocked.' }))
}
