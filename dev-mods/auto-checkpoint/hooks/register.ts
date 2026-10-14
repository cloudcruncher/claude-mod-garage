import type { Register, EngineInterface } from 'claude-code'
import {
  absolutePath, buildManifest, checkpointId, filePathsFor, formatListing, parseManifest,
  pruneList, resolveSelection, riskyBash, sortNewestFirst,
  type CheckpointRef, type Manifest,
} from './lib.ts'

type Engine = EngineInterface
const SNAPSHOT_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'] as const

let seq = 0

async function baseDir($: Engine): Promise<string> {
  const home = (await $.env.get('HOME')) ?? ''
  return `${home}/.claude/checkpoints`
}

async function sh($: Engine, argv: string[]): Promise<{ exitCode: number; stdout: string }> {
  const r = await $.process.run(argv, { timeoutMs: 20000 })
  return { exitCode: r.exitCode, stdout: r.stdout }
}

async function listRefs($: Engine, base: string): Promise<CheckpointRef[]> {
  const refs: CheckpointRef[] = []
  const sessions = await $.fs.list(base).catch(() => [])
  for (const s of sessions) {
    if (s.kind !== 'dir') continue
    const ids = await $.fs.list(`${base}/${s.name}`).catch(() => [])
    for (const i of ids) if (i.kind === 'dir') refs.push({ session: s.name, id: i.name })
  }
  return refs
}

async function snapshot($: Engine, tool: string, rawPaths: string[]): Promise<void> {
  const home = (await $.env.get('HOME')) ?? ''
  const cwd = await $.session.cwd()
  const base = await baseDir($)
  const sid = await $.session.id()
  const now = await $.clock.now()
  const paths = [...new Set(rawPaths.map(p => absolutePath(p, cwd, home)))]
  if (paths.length === 0) return
  const dir = `${base}/${sid}/${checkpointId(now, seq++ % 1000)}`
  await sh($, ['mkdir', '-p', `${dir}/files`])
  const items: { path: string; existed: boolean }[] = []
  for (const p of paths) items.push({ path: p, existed: await $.fs.exists(p).catch(() => false) })
  const manifest = buildManifest(tool, now, items)
  for (const entry of manifest.entries) {
    if (entry.existed && entry.stored !== undefined) {
      await sh($, ['cp', '-Rp', entry.path, `${dir}/files/${entry.stored}`])
    }
  }
  await $.fs.write(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2))
  for (const stale of pruneList(await listRefs($, base))) {
    await sh($, ['rm', '-rf', `${base}/${stale.session}/${stale.id}`])
  }
}

async function dirtyTrackedFiles($: Engine): Promise<string[]> {
  const top = await sh($, ['git', 'rev-parse', '--show-toplevel'])
  if (top.exitCode !== 0) return []
  const root = top.stdout.trim()
  const diff = await sh($, ['git', '-C', root, 'diff', '--name-only', 'HEAD'])
  if (diff.exitCode !== 0) return []
  return diff.stdout.split('\n').filter(Boolean).map(f => `${root}/${f}`)
}

async function loadSession($: Engine): Promise<{ id: string; manifest: Manifest; dir: string }[]> {
  const base = await baseDir($)
  const sid = await $.session.id()
  const ids = (await $.fs.list(`${base}/${sid}`).catch(() => [])).filter(e => e.kind === 'dir')
  const sorted = sortNewestFirst(ids.map(e => ({ session: sid, id: e.name })))
  const out: { id: string; manifest: Manifest; dir: string }[] = []
  for (const ref of sorted) {
    const dir = `${base}/${sid}/${ref.id}`
    const text = await $.fs.read(`${dir}/manifest.json`).catch(() => undefined)
    const manifest = typeof text === 'string' ? parseManifest(text) : undefined
    if (manifest) out.push({ id: ref.id, manifest, dir })
  }
  return out
}

async function restore($: Engine, dir: string, manifest: Manifest): Promise<string[]> {
  const lines: string[] = []
  for (const e of manifest.entries) {
    if (e.existed && e.stored !== undefined) {
      const parent = e.path.slice(0, e.path.lastIndexOf('/')) || '/'
      await sh($, ['mkdir', '-p', parent])
      await sh($, ['rm', '-rf', e.path])
      const r = await sh($, ['cp', '-Rp', `${dir}/files/${e.stored}`, e.path])
      lines.push(r.exitCode === 0 ? `restored ${e.path}` : `FAILED to restore ${e.path}`)
    } else {
      await sh($, ['rm', '-rf', e.path])
      lines.push(`removed ${e.path} (did not exist at checkpoint)`)
    }
  }
  return lines
}

export const register: Register = on => {
  for (const tool of SNAPSHOT_TOOLS) {
    on('tool.call', { tool }, async ($, e, next) => {
      try {
        await snapshot($, tool, filePathsFor(tool, e as unknown as Record<string, unknown>))
      } catch {
        // checkpointing must never block an edit
      }
      return next(e)
    }).catch(($, e, next) => next(e))
  }

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    try {
      const risk = riskyBash(e.command)
      if (risk) {
        const paths = [...risk.paths]
        if (risk.wholeTree) paths.push(...(await dirtyTrackedFiles($)))
        await snapshot($, 'Bash', paths)
      }
    } catch {
      // checkpointing must never block a command
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'rewind-to',
      description: 'List file checkpoints, or restore one: /rewind-to <n> | last',
      argumentHint: '[n|last]',
    })
    return next(e)
  })

  on('command.run', { command: 'rewind-to' }, async ($, e) => {
    const items = await loadSession($)
    const sel = resolveSelection(e.args, items.length)
    if (sel === 'list') return { text: formatListing(items) }
    if (sel === 'invalid') {
      return { text: `Nothing to restore for "${e.args}". ${formatListing(items)}` }
    }
    const chosen = items[sel]
    if (!chosen) return { text: 'No such checkpoint.' }
    const lines = await restore($, chosen.dir, chosen.manifest)
    return { text: `Rewound to checkpoint ${sel + 1}:\n${lines.join('\n')}` }
  })
}
