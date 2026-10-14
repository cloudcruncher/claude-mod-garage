export type Level = 'ok' | 'warn' | 'compact'

export const WARN_AT = 70
export const COMPACT_AT = 85

export function levelFor(percent: number | undefined): Level {
  if (percent === undefined) return 'ok'
  if (percent >= COMPACT_AT) return 'compact'
  if (percent >= WARN_AT) return 'warn'
  return 'ok'
}

/** Warn toast fires once per climb; resets after context drops below the warn level (e.g. after /compact). */
export function shouldToast(level: Level, alreadyWarned: boolean): boolean {
  return level !== 'ok' && !alreadyWarned
}

export const COMPACT_SECTION_TEXT = [
  'Context is nearly full (85% or more). Wrap up the current step, then run /compact.',
  'When compacting, keep: the task and acceptance criteria; files changed and why; failing test output verbatim; decisions made; branch/PR state.',
  'Drop: exploratory reads and passing output.',
].join('\n')
