import { expect, test } from 'claude-code/testing'
import { isAllowed, parseAllowlist, parseMaxRepeats, shouldBlock, signature, streak } from './lib'

test('signature ignores ids and key order', () => {
  const a = signature('Bash', { command: 'ls', tool_use_id: '1', agentId: 'x' })
  const b = signature('Bash', { tool_use_id: '2', command: 'ls' })
  expect(a).toBe(b)
  expect(signature('Bash', { command: 'pwd' })).not.toBe(a)
})

test('signature ignores the changing description', () => {
  expect(signature('Bash', { command: 'echo hi', description: 'Print hi (1/5)' }))
    .toBe(signature('Bash', { command: 'echo hi', description: 'Print hi again (2/5)', timeout: 5000 }))
})

test('streak counts only the trailing identical calls', () => {
  expect(streak(['a', 'b', 'b', 'b'], 'b')).toBe(3)
  expect(streak(['b', 'b', 'a'], 'b')).toBe(0)
  expect(streak([], 'b')).toBe(0)
})

test('shouldBlock fires at the threshold', () => {
  expect(shouldBlock(['b', 'b'], 'b', 3)).toBe(false)
  expect(shouldBlock(['b', 'b', 'b'], 'b', 3)).toBe(true)
})

test('maxRepeats must be a positive integer, else the default', () => {
  expect(parseMaxRepeats(5)).toBe(5)
  expect(parseMaxRepeats('4')).toBe(4)
  expect(parseMaxRepeats(1)).toBe(1)
  for (const bad of [0, -2, 2.5, NaN, '', 'abc', undefined, null]) expect(parseMaxRepeats(bad)).toBe(3)
})

test('allowlist matches tool names and Bash command prefixes', () => {
  const list = parseAllowlist(undefined)
  expect(isAllowed('TaskOutput', undefined, list)).toBe(true)
  expect(isAllowed('Bash', 'gh run view 123 --log', list)).toBe(true)
  expect(isAllowed('Bash', 'git status', list)).toBe(true)
  expect(isAllowed('Bash', 'git statusx', list)).toBe(false)
  expect(isAllowed('Bash', 'ls', list)).toBe(false)
  expect(parseAllowlist(' a , ,b ')).toEqual(['a', 'b'])
})
