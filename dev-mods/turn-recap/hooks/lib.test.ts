import { expect, test } from 'claude-code/testing'
import { dur, fresh, recap, record } from './lib'

test('record counts tools and unique edited files', () => {
  const t = fresh()
  record(t, 'Read', { file_path: '/a' })
  record(t, 'Edit', { file_path: '/a' })
  record(t, 'Write', { file_path: '/a' })
  record(t, 'Write', { file_path: '/b' })
  expect(t.tools).toBe(4)
  expect([...t.files]).toEqual(['/a', '/b'])
})

test('recap is silent for short or empty turns', () => {
  const t = fresh()
  expect(recap(t, 60000, 20)).toBeUndefined()
  record(t, 'Bash', { command: 'ls' })
  expect(recap(t, 5000, 20)).toBeUndefined()
})

test('recap line', () => {
  const t = fresh()
  record(t, 'Bash', { command: 'ls' })
  record(t, 'Edit', { file_path: '/a' })
  expect(recap(t, 95000, 20)).toBe('Turn done in 1m 35s · 2 tool calls · 1 file edited')
  expect(dur(4000)).toBe('4s')
})
