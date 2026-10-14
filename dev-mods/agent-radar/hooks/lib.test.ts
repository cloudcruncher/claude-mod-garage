import { expect, test } from 'claude-code/testing'
import { clip, filesTouched, finish, fmtDur, label, lastCalls, latestFor, preview, running, sayText, start, type Call } from './lib'

const call = (id: string, tool: string, lbl = '', agentId?: string): Call => ({ id, tool, label: lbl, start: 0, agentId })

test('label summarises the tool target', () => {
  expect(label('Bash', { command: 'npm   test\n--watch' })).toBe('npm test --watch')
  expect(label('Edit', { file_path: '/a/b/c/file.ts' })).toBe('c/file.ts')
  expect(label('Agent', { description: 'scan repo' })).toBe('scan repo')
  expect(label('Unknown', {})).toBe('')
})

test('label truncates long commands', () => {
  expect(label('Bash', { command: 'x'.repeat(200) }).length).toBe(70)
})

test('start keeps only the newest 300 calls', () => {
  let l: Call[] = []
  for (let i = 0; i < 305; i++) l = start(l, call(String(i), 'Read'))
  expect(l.length).toBe(300)
  expect(l[0].id).toBe('5')
})

test('finish marks a call done and running() drops it', () => {
  let l = start(start([], call('1', 'Bash')), call('2', 'Read'))
  l = finish(l, '1', 5000, true)
  expect(running(l).map(c => c.id)).toEqual(['2'])
  expect(l[0].isError).toBe(true)
})

test('filesTouched counts edits only, busiest first', () => {
  const l = [call('1', 'Edit', 'a.ts'), call('2', 'Read', 'z.ts'), call('3', 'Write', 'b.ts'), call('4', 'Edit', 'b.ts')]
  expect(filesTouched(l)).toEqual([{ path: 'b.ts', count: 2 }, { path: 'a.ts', count: 1 }])
})

test('latestFor picks the newest call of that loop', () => {
  const l = [call('1', 'Read', 'x', 'ag1'), call('2', 'Bash', 'y'), call('3', 'Grep', 'z', 'ag1')]
  expect(latestFor(l, 'ag1')?.id).toBe('3')
  expect(latestFor(l)?.id).toBe('2')
  expect(latestFor(l, 'nope')).toBeUndefined()
})

test('fmtDur formats seconds and minutes', () => {
  expect(fmtDur(4400)).toBe('4s')
  expect(fmtDur(125000)).toBe('2m05s')
})

test('preview takes the first non-empty line and shortens it', () => {
  expect(preview('\n\n  12 passed\nmore')).toBe('12 passed')
  expect(preview('x'.repeat(200)).length).toBe(90)
  expect(preview(undefined)).toBe('')
})

test('sayText reads only text blocks, never thinking or tool_use', () => {
  const blocks = [
    { type: 'thinking', thinking: 'secret reasoning' },
    { type: 'text', text: 'Running the  tests now.' },
    { type: 'tool_use', name: 'Bash' },
    { type: 'text', text: 'Then fixing.' },
  ]
  expect(sayText(blocks)).toBe('Running the tests now. Then fixing.')
  expect(sayText('nope')).toBe('')
})

test('finish stores the result preview', () => {
  const l = finish(start([], call('1', 'Bash')), '1', 9, false, '12 passed')
  expect(l[0].out).toBe('12 passed')
})

test('lastCalls and clip', () => {
  const l = [call('1', 'Read', 'a', 'x'), call('2', 'Bash', 'b', 'x'), call('3', 'Edit', 'c', 'x'), call('4', 'Grep', 'd')]
  expect(lastCalls(l, 'x', 2).map(c => c.id)).toEqual(['2', '3'])
  expect(clip('abcdef', 4)).toBe('abc…')
})

test('preview of a failure reads the last line', () => {
  expect(preview('Exit code 2\nls: /x: No such file or directory', 90, true)).toBe('ls: /x: No such file or directory')
})
