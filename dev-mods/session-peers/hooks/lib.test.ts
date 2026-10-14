import { expect, test } from 'claude-code/testing'
import { ago, format, lines, parse } from './lib'

const raw = JSON.stringify({
  pid: 7, sessionId: 'b79115aa-0000-0000-0000-000000000000', name: 'robin-mods-50',
  kind: 'interactive', status: 'idle', startedAt: 1_000_000,
})

test('parse a session file', () => {
  expect(parse(raw)?.name).toBe('robin-mods-50')
  expect(parse('not json')).toBeUndefined()
  expect(parse('{"pid":1}')).toBeUndefined()
})

test('parse falls back to pid name', () => {
  expect(parse('{"pid":9,"sessionId":"abc"}')?.name).toBe('pid-9')
})

test('ago', () => {
  expect(ago(10_000)).toBe('just now')
  expect(ago(90_000)).toBe('1 minute ago')
  expect(ago(3 * 3600_000)).toBe('3 hours ago')
})

test('format matches the ListAgents style', () => {
  const p = parse(raw)!
  expect(format(p, 1_000_000 + 60_000)).toBe('robin-mods-50 (ref b79115, interactive, idle, started 1 minute ago)')
  expect(format(p, 1_000_000, p.sessionId)).toContain('· this one')
})

test('lines caps the list', () => {
  const p = parse(raw)!
  expect(lines([p, p, p], 1_000_000, undefined, 2)).toHaveLength(3)
})
