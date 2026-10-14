import type { Register } from 'claude-code'
import { fresh, recap, record } from './lib'

export const register: Register = (on, options) => {
  const minSeconds = Number(options?.minSeconds ?? 20)
  let tally = fresh()

  on('turn.start', (_$, e, next) => {
    if (!e.agentId) tally = fresh()
    return next(e)
  })

  // Subagent calls count too: they are part of what the turn did.
  on('tool.call', (_$, e, next) => {
    record(tally, e.tool, e as unknown as Record<string, unknown>)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', ($, e, next) => {
    if (!e.agentId) {
      const line = recap(tally, e.durationMs ?? 0, minSeconds)
      if (line) $.ui.toast(line)
    }
    return next(e)
  })
}
