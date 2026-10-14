import { test, expect } from 'claude-code/testing'
import { levelFor, shouldToast, COMPACT_SECTION_TEXT } from './guard'

test('levelFor thresholds', () => {
  expect(levelFor(undefined)).toBe('ok')
  expect(levelFor(69.9)).toBe('ok')
  expect(levelFor(70)).toBe('warn')
  expect(levelFor(84)).toBe('warn')
  expect(levelFor(85)).toBe('compact')
  expect(levelFor(100)).toBe('compact')
})

test('shouldToast only once per climb', () => {
  expect(shouldToast('ok', false)).toBe(false)
  expect(shouldToast('warn', false)).toBe(true)
  expect(shouldToast('warn', true)).toBe(false)
  expect(shouldToast('compact', true)).toBe(false)
})

test('compact text carries the keep-rules', () => {
  for (const s of ['/compact', 'acceptance criteria', 'files changed', 'failing test output verbatim', 'decisions', 'branch/PR state', 'exploratory reads', 'passing output'])
    expect(COMPACT_SECTION_TEXT).toContain(s)
})
