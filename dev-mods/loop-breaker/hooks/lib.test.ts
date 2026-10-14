import { expect, test } from 'claude-code/testing'
import { shouldBlock, signature, streak } from './lib'

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
