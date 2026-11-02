import type { Register, EngineInterface } from 'claude-code'
import {
  absolutePath, buildManifest, checkpointId, filePathsFor, formatListing, parseManifest,
  pruneList, resolveSelection, riskyBash, skipReason, sortNewestFirst,
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
  const skipped: string[] = []
  for (const p of paths) {
    const existed = await $.fs.exists(p).catch(() => false)
    if (!existed) {
      items.push({ path: p, existed: false })
      continue
    }
    // Only record a file as stored when its copy really succeeded; otherwise leave it out
    // of the manifest, so a restore can never delete a file we failed to save.
    const du = await sh($, ['du', '-sk', p]).catch(() => undefined)
    const sizeKb = du && du.exitCode === 0 ? Number(du.stdout.split(/\s/)[0]) : undefined
    const why = skipReason(p, Number.isFinite(sizeKb) ? sizeKb : undefined)
    if (why) {
      skipped.push(`${p} (${why})`)
      continue
    }
    const index = items.length
    const copied = await sh($, ['cp', '-Rp', p, `${dir}/files/${index}`]).catch(() => undefined)
    if (copied && copied.exitCode === 0) items.push({ path: p, existed: true })
    else skipped.push(`${p} (copy failed)`)
  }
  if (skipped.length > 0) $.ui.log(`auto-checkpoint: not snapshotted: ${skipped.join(', ')}`)
  if (items.length === 0) {
    await sh($, ['rm', '-rf', dir])
    return
  }
  const manifest = buildManifest(tool, now, items)
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
      // Copy beside the target and rename into place, so a failed copy never loses the current file.
      const tmp = `${e.path}.rewind-tmp`
      const src = `${dir}/files/${e.stored}`
      const c = await sh($, ['rm', '-rf', tmp]).then(() => sh($, ['cp', '-Rp', src, tmp]))
      let ok = c.exitCode === 0
      if (ok) {
        const isDir = (await sh($, ['test', '-d', e.path])).exitCode === 0
        if (isDir) {
          // mv would nest a directory inside the existing one: move the old one aside first
          const old = `${e.path}.rewind-old`
          await sh($, ['rm', '-rf', old]) // left over from a crashed restore
          if ((await sh($, ['mv', e.path, old])).exitCode === 0) {
            ok = (await sh($, ['mv', tmp, e.path])).exitCode === 0
            if (ok) await sh($, ['rm', '-rf', old])
            else await sh($, ['mv', old, e.path])
          } else {
            ok = false
          }
        } else {
          ok = (await sh($, ['mv', '-f', tmp, e.path])).exitCode === 0
        }
      }
      if (!ok) await sh($, ['rm', '-rf', tmp])
      lines.push(ok ? `restored ${e.path}` : `FAILED to restore ${e.path}`)
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
        if (risk.unsnapshotted) {
          $.ui.toast('auto-checkpoint: git clean deletes untracked files, which cannot be snapshotted')
        }
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
