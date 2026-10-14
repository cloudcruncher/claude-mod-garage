import type { Register } from 'claude-code'
import { crossed, pickTier, statusLine } from './route'

const THRESHOLDS = [70, 85] as const

export const register: Register = on => {
  const fired = new Set<number>()

  on('session.measure', ($, e, next) => {
    const five = e.rateLimits.find(r => r.kind === 'five_hour')?.percentUsed
    $.ui.status(statusLine(five, e.context.percent))
    if (five !== undefined) {
      for (const t of crossed(five, THRESHOLDS, fired)) {
        fired.add(t)
        $.ui.toast(`5h usage passed ${t}% (now ${Math.round(five)}%)`)
      }
    }
    return next(e)
  })

  on('tool.call', { tool: 'Agent' }, ($, e, next) => {
    if (e.model !== undefined) return next(e)
    const tier = pickTier(`${e.description ?? ''} ${e.prompt ?? ''}`)
    return tier ? next({ ...e, model: tier }) : next(e)
  })
}
