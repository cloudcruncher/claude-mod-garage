import type { Register } from 'claude-code'
import { shouldBlock, signature, streak } from './lib'

const KEEP = 20

export const register: Register = (on, options) => {
  const maxRepeats = Math.max(2, Number(options?.maxRepeats ?? 3))
  // One history per loop, so a subagent repeating itself is judged on its own calls.
  const history = new Map<string, string[]>()

  on('tool.call', ($, e, next) => {
    const loop = e.agentId ?? 'main'
    const past = history.get(loop) ?? []
    const sig = signature(e.tool, e as unknown as Record<string, unknown>)
    if (shouldBlock(past, sig, maxRepeats)) {
      $.ui.toast(`loop-breaker: refused a ${e.tool} call repeated ${streak(past, sig) + 1} times`)
      history.set(loop, [])
      return { deny: `This exact ${e.tool} call has already run ${streak(past, sig)} times in a row with the same arguments. Repeating it will not change the result. Re-read the output, change the arguments, or try a different approach.` }
    }
    history.set(loop, [...past, sig].slice(-KEEP))
    return next(e)
  }).catch(($, e, next) => next(e))
}
