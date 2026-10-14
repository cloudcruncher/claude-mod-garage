import { test, expect } from 'claude-code/testing'
import { pickTier, crossed, statusLine } from './route'

test('pickTier maps keywords to tiers', () => {
  expect(pickTier('search the repo for usages')).toBe('haiku')
  expect(pickTier('summarize this log')).toBe('haiku')
  expect(pickTier('implement the parser and add tests')).toBe('sonnet')
  expect(pickTier('fix the failing build')).toBe('sonnet')
  expect(pickTier('security review of the auth module')).toBe('opus')
  expect(pickTier('architecture design for the sync layer')).toBe('opus')
  expect(pickTier('hello there')).toBeUndefined()
})

test('crossed fires each threshold once', () => {
  expect(crossed(60, [70, 85], new Set())).toEqual([])
  expect(crossed(72, [70, 85], new Set())).toEqual([70])
  expect(crossed(90, [70, 85], new Set())).toEqual([70, 85])
  expect(crossed(90, [70, 85], new Set([70]))).toEqual([85])
})

test('statusLine degrades when values are missing', () => {
  expect(statusLine(42.4, 10)).toBe('5h 42% | ctx 10%')
  expect(statusLine(undefined, undefined)).toBe('5h n/a | ctx n/a')
})
