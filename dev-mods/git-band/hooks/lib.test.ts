import { expect, test } from 'claude-code/testing'
import { format, parse } from './lib'

test('parse branch with tracking and counts', () => {
  const g = parse('## main...origin/main [ahead 2, behind 1]\n M a.ts\n?? b.ts\n')
  expect(g).toEqual({ branch: 'main', changed: 2, ahead: 2, behind: 1 })
})

test('parse clean branch without upstream', () => {
  expect(parse('## feature/x-y\n')).toEqual({ branch: 'feature/x-y', changed: 0, ahead: 0, behind: 0 })
})

test('parse fresh repo and non-git output', () => {
  expect(parse('## No commits yet on main\n')?.branch).toBe('main')
  expect(parse('fatal: not a git repository')).toBeUndefined()
})

test('format', () => {
  expect(format({ branch: 'main', changed: 0, ahead: 0, behind: 0 })).toBe('⎇ main ✓ clean')
  expect(format({ branch: 'dev', changed: 3, ahead: 1, behind: 2 })).toBe('⎇ dev ● 3 changed ↑1 ↓2')
})
