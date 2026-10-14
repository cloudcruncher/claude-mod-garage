import { test, expect } from 'claude-code/testing'
import {
  detectChecks, detectPackageManager, tailOutput, failureMessage, winsLine, projectName, MAX_RETRIES, isCodeEdit,
} from './lib.ts'

const pkg = (scripts: Record<string, string>): string => JSON.stringify({ scripts })

test('package manager follows the lockfile', () => {
  expect(detectPackageManager(['pnpm-lock.yaml'])).toBe('pnpm')
  expect(detectPackageManager(['yarn.lock'])).toBe('yarn')
  expect(detectPackageManager(['bun.lockb'])).toBe('bun')
  expect(detectPackageManager(['package-lock.json'])).toBe('npm')
  expect(detectPackageManager([])).toBe('npm')
})

test('node scripts detected with the right manager', () => {
  const checks = detectChecks({
    names: ['package.json', 'pnpm-lock.yaml'],
    packageJson: pkg({ test: 'vitest', lint: 'eslint .', 'type-check': 'tsc --noEmit', build: 'tsc' }),
  })
  expect(checks.map(c => c.argv)).toEqual([['pnpm', 'test'], ['pnpm', 'run', 'lint'], ['pnpm', 'run', 'type-check']])
  const yarn = detectChecks({ names: ['yarn.lock'], packageJson: pkg({ lint: 'x' }) })
  expect(yarn[0]?.argv).toEqual(['yarn', 'lint'])
})

test('npm placeholder test and broken json are ignored', () => {
  expect(detectChecks({ names: [], packageJson: pkg({ test: 'echo "Error: no test specified" && exit 1' }) })).toEqual([])
  expect(detectChecks({ names: [], packageJson: '{bad' })).toEqual([])
  expect(detectChecks({ names: [], packageJson: pkg({ build: 'x' }) })).toEqual([])
})

test('python checks use uv and only what is configured', () => {
  const py = '[project]\ndependencies=[]\n[tool.pytest.ini_options]\n[tool.ruff]\n[tool.mypy]\n'
  expect(detectChecks({ names: ['pyproject.toml'], pyproject: py }).map(c => c.name)).toEqual(['pytest', 'ruff', 'mypy'])
  const pyright = detectChecks({ names: [], pyproject: '[tool.pyright]\n' })
  expect(pyright.map(c => c.name)).toEqual(['pyright'])
  expect(detectChecks({ names: [], pyproject: '[project]\nname="x"\n' })).toEqual([])
})

test('makefile test target', () => {
  expect(detectChecks({ names: [], makefile: 'build:\n\tcc x\n\ntest:\n\t./t\n' })[0]?.argv).toEqual(['make', 'test'])
  expect(detectChecks({ names: [], makefile: 'build:\n\tcc x\n' })).toEqual([])
})

test('nothing detected means nothing to run', () => {
  expect(detectChecks({ names: ['README.md'] })).toEqual([])
})

test('tailOutput keeps the end', () => {
  expect(tailOutput('short', 10)).toBe('short')
  const t = tailOutput('a'.repeat(50) + 'END', 10)
  expect(t.endsWith('aaaaaaaEND')).toBe(true)
  expect(t).toContain('cut')
})

test('failureMessage includes failing output verbatim and skips passes', () => {
  const msg = failureMessage([
    { check: { name: 'lint', argv: ['npm', 'run', 'lint'] }, exitCode: 1, output: 'src/a.ts:1 error X' },
    { check: { name: 'test', argv: ['npm', 'test'] }, exitCode: 0, output: 'all good' },
  ], 2)
  expect(msg).toContain('src/a.ts:1 error X')
  expect(msg).not.toContain('all good')
  expect(msg).toContain(`attempt 2 of ${MAX_RETRIES}`)
})

test('winsLine format and projectName', () => {
  expect(winsLine('2026-10-08T12:00:00.000Z', 'proj', ['npm test', 'npm run lint'])).toBe('2026-10-08 | proj | npm test, npm run lint')
  expect(projectName('/a/b/proj/')).toBe('proj')
})

test('docs and assets do not trigger checks, code does', () => {
  expect(isCodeEdit('/p/docs/offline.html')).toBe(false)
  expect(isCodeEdit('/p/README.md')).toBe(false)
  expect(isCodeEdit('/p/src/app.ts')).toBe(true)
  expect(isCodeEdit('/p/pyproject.toml')).toBe(false)
  expect(isCodeEdit(undefined)).toBe(true)
})
