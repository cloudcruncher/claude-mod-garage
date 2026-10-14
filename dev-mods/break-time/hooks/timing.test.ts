import { expect, test } from 'claude-code/testing'

import {
  advance, formatCountdown, initialState, isDue, remainingSec, renderScene, snooze, tipFor, tipIndex, walkFrame, walkX, WALK,
} from './timing'

const cfg = { intervalMin: 150, breakMin: 5, snoozeMin: 15 }

test('active time accrues only when not idle, and trips at the interval', async () => {
  let s = initialState()
  s = advance(s, 60_000, 0)
  expect(s.activeMs).toBe(60_000)
  s = advance(s, 60_000, 10 * 60_000) // idle for 10 min: ignored
  expect(s.activeMs).toBe(60_000)
  expect(isDue(s, cfg)).toBe(false)
  expect(isDue({ activeMs: 150 * 60_000, snoozeUntilMs: 0 }, cfg)).toBe(true)
})

test('snooze pushes the next reminder 15 active minutes out', async () => {
  const s = snooze({ activeMs: 150 * 60_000, snoozeUntilMs: 0 }, cfg)
  expect(isDue(s, cfg)).toBe(false)
  expect(isDue({ ...s, activeMs: 165 * 60_000 }, cfg)).toBe(true)
})

test('walk cycle has 4+ frames, moves right and loops', async () => {
  expect(WALK.length).toBeGreaterThanOrEqual(4)
  expect(walkFrame(0)).toEqual(walkFrame(4))
  expect(walkFrame(0)).not.toEqual(walkFrame(1))
  expect(walkX(1, 40)).toBeGreaterThan(walkX(0, 40))
  expect(walkX(37, 40)).toBe(0) // span = 37, loops
})

test('tips rotate every 20 seconds through four tips', async () => {
  expect(tipIndex(0)).toBe(0)
  expect(tipIndex(19)).toBe(0)
  expect(tipIndex(20)).toBe(1)
  expect(tipIndex(80)).toBe(0)
  expect(tipFor(40)).toMatch(/20-20-20/)
})

test('countdown formatting and scene shape', async () => {
  expect(remainingSec(0, 5)).toBe(300)
  expect(remainingSec(400, 5)).toBe(0)
  expect(formatCountdown(299)).toBe('04:59')
  const scene = renderScene(3, 50, 20, 5)
  expect(scene.some(l => l.includes('Break ends in 04:40'))).toBe(true)
  expect(scene.every(l => l.length <= 50)).toBe(true)
  expect(renderScene(0, 50, 999, 5).join('\n')).toMatch(/Break over/)
})
