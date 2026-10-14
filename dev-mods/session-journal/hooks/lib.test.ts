import { expect, test } from 'claude-code/testing'
import { add, fromTool, render, type Entry } from './lib'

test('fromTool records bash and edits only', () => {
  expect(fromTool('Bash', { command: 'npm  test' }, 1)).toEqual({ kind: 'bash', at: 1, text: 'npm test' })
  expect(fromTool('Edit', { file_path: '/a.ts' }, 2)).toEqual({ kind: 'edit', at: 2, text: '/a.ts' })
  expect(fromTool('Read', { file_path: '/a.ts' }, 3)).toBeUndefined()
})

test('add caps the journal at 1000 entries', () => {
  let l: Entry[] = []
  for (let i = 0; i < 1005; i++) l = add(l, { kind: 'bash', at: i, text: String(i) })
  expect(l.length).toBe(1000)
  expect(l[0].text).toBe('5')
})

test('render groups work under prompts and lists changed files', () => {
  const md = render([
    { kind: 'prompt', at: Date.UTC(2026, 9, 14, 9, 30), text: 'fix the bug' },
    { kind: 'bash', at: 2, text: 'npm test' },
    { kind: 'edit', at: 3, text: '/src/a.ts' },
    { kind: 'edit', at: 4, text: '/src/a.ts' },
  ], 'Session')
  expect(md).toContain('## 09:30 · fix the bug')
  expect(md).toContain('- ran `npm test`')
  expect(md).toContain('- `/src/a.ts` (×2)')
})
