// Pure detection and formatting logic for verify-gate.

export const MAX_RETRIES = 3

const NON_CODE = /\.(md|mdx|txt|html?|css|svg|png|jpe?g|gif|pdf|csv|ya?ml|toml|ini|lock|log)$/i

/** True when editing this path can change what tests, lint or types see. */
export function isCodeEdit(path: string | undefined): boolean {
  return path === undefined || !NON_CODE.test(path)
}

export type Check = { name: string; argv: string[] }

export type ProjectFiles = {
  /** names of files present in the project root */
  names: string[]
  packageJson?: string
  pyproject?: string
  makefile?: string
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export function detectPackageManager(names: string[]): PackageManager {
  if (names.includes('pnpm-lock.yaml')) return 'pnpm'
  if (names.includes('yarn.lock')) return 'yarn'
  if (names.includes('bun.lock') || names.includes('bun.lockb')) return 'bun'
  return 'npm'
}

function scriptArgv(pm: PackageManager, script: string): string[] {
  if (script === 'test' && (pm === 'npm' || pm === 'pnpm' || pm === 'yarn')) return [pm, 'test']
  return pm === 'yarn' ? ['yarn', script] : [pm, 'run', script]
}

const NODE_SCRIPTS: { key: string; aliases: string[] }[] = [
  { key: 'test', aliases: ['test'] },
  { key: 'lint', aliases: ['lint'] },
  { key: 'typecheck', aliases: ['typecheck', 'type-check', 'check-types'] },
]

function detectNode(files: ProjectFiles): Check[] {
  if (files.packageJson === undefined) return []
  let scripts: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(files.packageJson) as { scripts?: Record<string, unknown> }
    scripts = parsed.scripts ?? {}
  } catch {
    return []
  }
  const pm = detectPackageManager(files.names)
  const out: Check[] = []
  for (const { key, aliases } of NODE_SCRIPTS) {
    const script = aliases.find(a => typeof scripts[a] === 'string')
    if (script === undefined) continue
    // the npm init placeholder is not a real test
    if (key === 'test' && /no test specified/i.test(String(scripts[script]))) continue
    out.push({ name: `${pm} ${script}`, argv: scriptArgv(pm, script) })
  }
  return out
}

function detectPython(files: ProjectFiles): Check[] {
  const py = files.pyproject
  if (py === undefined) return []
  const out: Check[] = []
  const mentions = (word: string): boolean => new RegExp(`\\b${word}\\b`, 'i').test(py)
  if (/\[tool\.pytest/.test(py) || mentions('pytest') || files.names.includes('tests')) {
    out.push({ name: 'pytest', argv: ['uv', 'run', 'pytest', '-q', '-x'] })
  }
  if (/\[tool\.ruff/.test(py) || mentions('ruff')) {
    out.push({ name: 'ruff', argv: ['uv', 'run', 'ruff', 'check', '.'] })
  }
  if (/\[tool\.mypy/.test(py) || mentions('mypy')) {
    out.push({ name: 'mypy', argv: ['uv', 'run', 'mypy', '.'] })
  } else if (/\[tool\.pyright/.test(py) || mentions('pyright')) {
    out.push({ name: 'pyright', argv: ['uv', 'run', 'pyright'] })
  }
  return out
}

function detectMake(files: ProjectFiles): Check[] {
  return files.makefile !== undefined && /^test\s*:/m.test(files.makefile)
    ? [{ name: 'make test', argv: ['make', 'test'] }]
    : []
}

/** The fast checks this project defines; empty when none are found. */
export function detectChecks(files: ProjectFiles): Check[] {
  return [...detectNode(files), ...detectPython(files), ...detectMake(files)]
}

export type CheckResult = { check: Check; exitCode: number; output: string }

/** Keeps the end of long output, where the failures are. */
export function tailOutput(text: string, max = 6000): string {
  return text.length <= max ? text : `[... ${text.length - max} characters cut ...]\n${text.slice(text.length - max)}`
}

export function failureMessage(results: CheckResult[], attempt: number): string {
  const failed = results.filter(r => r.exitCode !== 0)
  const body = failed
    .map(r => `$ ${r.check.argv.join(' ')}   (exit ${r.exitCode})\n${tailOutput(r.output)}`)
    .join('\n\n')
  return `verify-gate: ${failed.length} check(s) failed after your edits (attempt ${attempt} of ${MAX_RETRIES}). Fix the problems below, then finish again.\n\n${body}`
}

export function winsLine(dateIso: string, projectDir: string, passed: string[]): string {
  return `${dateIso.slice(0, 10)} | ${projectDir} | ${passed.join(', ')}`
}

export function projectName(cwd: string): string {
  return cwd.replace(/\/+$/, '').split('/').pop() || cwd
}
