// Pure timing and frame logic for break-time. No engine APIs here.

export type BreakState = {
  activeMs: number // active time accumulated since the last break
  snoozeUntilMs: number // active-ms threshold; 0 = none
}

export type Config = { intervalMin: number; breakMin: number; snoozeMin: number }

export const IDLE_CUTOFF_MS = 5 * 60_000
export const TIP_SECONDS = 20

export const TIPS = [
  'Neck: slowly tilt your ear toward each shoulder, 15 seconds a side.',
  'Wrists: extend an arm, palm up, and gently pull the fingers back. Switch.',
  'Eyes (20-20-20): look at something 20 feet away for 20 seconds.',
  'Stand up and walk around. Refill your water while you are at it.',
]

export function initialState(): BreakState {
  return { activeMs: 0, snoozeUntilMs: 0 }
}

/** Adds dtMs of active time if the last activity was within the idle cutoff. */
export function advance(s: BreakState, dtMs: number, sinceActivityMs: number): BreakState {
  if (sinceActivityMs > IDLE_CUTOFF_MS) return s
  return { ...s, activeMs: s.activeMs + dtMs }
}

export function isDue(s: BreakState, cfg: Config): boolean {
  const threshold = Math.max(cfg.intervalMin * 60_000, s.snoozeUntilMs)
  return s.activeMs >= threshold
}

/** Snooze: next reminder after snoozeMin more active minutes. */
export function snooze(s: BreakState, cfg: Config): BreakState {
  return { ...s, snoozeUntilMs: s.activeMs + cfg.snoozeMin * 60_000 }
}

export function reset(): BreakState {
  return initialState()
}

export function tipIndex(elapsedSec: number): number {
  return Math.floor(Math.max(0, elapsedSec) / TIP_SECONDS) % TIPS.length
}

export function tipFor(elapsedSec: number): string {
  return TIPS[tipIndex(elapsedSec)]
}

export function remainingSec(elapsedSec: number, breakMin: number): number {
  return Math.max(0, Math.round(breakMin * 60 - elapsedSec))
}

export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// Four-frame walk cycle, each figure 3 rows x 3 cols.
export const WALK: string[][] = [
  [' o ', '/|\\', '/ >'],
  [' o ', ' |\\', ' |\\'],
  [' o ', '\\|/', '< \\'],
  [' o ', '/| ', '/| '],
]

/** Column of the figure's left edge for a tick, moving right and looping. */
export function walkX(tick: number, width: number, step = 1): number {
  const span = Math.max(1, width - 3)
  return (Math.max(0, tick) * step) % span
}

export function walkFrame(tick: number): string[] {
  return WALK[Math.max(0, tick) % WALK.length]
}

const STEAM: string[][] = [
  ['  ) ( ', '  ( ) '],
  ['  ( ) ', '  ) ( '],
  ['  ) ) ', '  ( ( '],
]
const CUP = [' .-----.', ' |     |]', ' \\_____/']

export function cupLines(tick: number): string[] {
  return [...STEAM[Math.floor(Math.max(0, tick) / 2) % STEAM.length], ...CUP]
}

function place(row: string, x: number, piece: string, width: number): string {
  const padded = row.padEnd(width, ' ')
  return (padded.slice(0, x) + piece + padded.slice(x + piece.length)).slice(0, width)
}

export function wrap(text: string, width: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  return out
}

/** The whole scene as lines: walker, cup, countdown, tip. tick advances 4/s. */
export function renderScene(tick: number, width: number, elapsedSec: number, breakMin: number): string[] {
  const w = Math.max(24, width)
  const fig = walkFrame(tick)
  const x = walkX(tick, w, 1)
  const walker = fig.map(r => place(''.padEnd(w, ' '), x, r, w))
  const ground = '_'.repeat(w)
  const cup = cupLines(tick).map(r => r.padEnd(w, ' ').slice(0, w))
  const left = remainingSec(elapsedSec, breakMin)
  const done = left === 0
  const status = done ? 'Break over. Back to it when you are ready.' : `Break ends in ${formatCountdown(left)}`
  const tip = done ? 'Run /break-done to reset the timer.' : tipFor(elapsedSec)
  return [...walker, ground, '', ...cup, '', ...wrap(status, w), '', ...wrap(tip, w)]
}
