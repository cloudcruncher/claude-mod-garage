import type { Register } from 'claude-code'
import { isAllowed, parseAllowlist, parseMaxRepeats, shouldBlock, signature, streak } from './lib'

const KEEP = 20

export const register: Register = (on, options) => {
  const maxRepeats = parseMaxRepeats(options?.maxRepeats)
  const allowlist = parseAllowlist(options?.allowlist)
  // One history per loop, so a subagent repeating itself is judged on its own calls.
  const history = new Map<string, string[]>()

  // A new turn is a new chance: a command repeated across turns is not a loop.
  on('turn.start', ($, e, next) => {
    history.clear()
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', ($, e, next) => {
    // polling calls are meant to repeat
    if (isAllowed(e.tool, (e as { command?: unknown }).command, allowlist)) return next(e)
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
