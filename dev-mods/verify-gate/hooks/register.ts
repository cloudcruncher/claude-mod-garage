import type { Register, EngineInterface } from 'claude-code'
import {
  MAX_RETRIES, detectChecks, isCodeEdit, failureMessage, projectName, winsLine,
  type CheckResult, type ProjectFiles,
} from './lib.ts'

type Engine = EngineInterface

// Per-session counters; a hot reload resets them, which only gives a fresh budget.
let hasEdits = false
let retries = 0

async function readIfThere($: Engine, path: string): Promise<string | undefined> {
  if (!(await $.fs.exists(path).catch(() => false))) return undefined
  const text = await $.fs.read(path).catch(() => undefined)
  return typeof text === 'string' ? text : undefined
}

async function loadProject($: Engine, cwd: string): Promise<ProjectFiles> {
  const entries = await $.fs.list(cwd).catch(() => [])
  const names = entries.map(e => e.name)
  const files: ProjectFiles = { names }
  if (names.includes('package.json')) files.packageJson = await readIfThere($, `${cwd}/package.json`)
  if (names.includes('pyproject.toml')) files.pyproject = await readIfThere($, `${cwd}/pyproject.toml`)
  const make = names.find(n => n === 'Makefile' || n === 'makefile' || n === 'GNUmakefile')
  if (make) files.makefile = await readIfThere($, `${cwd}/${make}`)
  return files
}

async function appendWin($: Engine, line: string): Promise<void> {
  const home = (await $.env.get('HOME')) ?? ''
  const path = `${home}/.claude/state/wins.md`
  const old = (await readIfThere($, path)) ?? ''
  await $.fs.write(path, `${old}${old === '' || old.endsWith('\n') ? '' : '\n'}${line}\n`)
}

export const register: Register = on => {
  for (const tool of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'] as const) {
    on('tool.call', { tool }, ($, e, next) => {
      const path = tool === 'NotebookEdit' ? (e as { notebook_path?: string }).notebook_path : (e as { file_path?: string }).file_path
      if (isCodeEdit(path)) hasEdits = true
      return next(e)
    }).catch(($, e, next) => next(e))
  }

  on('turn.start', ($, e, next) => {
    hasEdits = false
    retries = 0
    return next(e)
  })

  on('classic.Stop', async ($, e, next) => {
    const base = await next(e)
    if (!hasEdits) return base
    const cwd = e.cwd
    const checks = detectChecks(await loadProject($, cwd))
    if (checks.length === 0) {
      hasEdits = false
      return base
    }

    const results: CheckResult[] = []
    for (const check of checks) {
      try {
        const r = await $.process.run(check.argv, { cwd, timeoutMs: 180000 })
        results.push({ check, exitCode: r.exitCode, output: `${r.stdout}${r.stderr}`.trim() })
      } catch (err) {
        results.push({ check, exitCode: 1, output: `could not run: ${String(err)}` })
      }
    }

    if (results.every(r => r.exitCode === 0)) {
      hasEdits = false
      retries = 0
      const passed = results.map(r => r.check.name)
      $.ui.toast('verified')
      const now = await $.clock.now()
      await appendWin($, winsLine(new Date(now).toISOString(), projectName(cwd), passed)).catch(() => undefined)
      return base
    }

    if (retries >= MAX_RETRIES) {
      $.ui.toast(`verify-gate: still failing after ${MAX_RETRIES} retries, giving up this turn`)
      hasEdits = false
      retries = 0
      return base
    }
    retries += 1
    return { ...base, block: failureMessage(results, retries) }
  }).catch(($, e, next) => next(e))
}
