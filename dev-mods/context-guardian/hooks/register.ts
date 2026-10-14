import type { Register } from 'claude-code'
import { COMPACT_SECTION_TEXT, levelFor, shouldToast } from './guard'

export const register: Register = on => {
  let level = levelFor(undefined)
  let warned = false

  on('session.measure', ($, e, next) => {
    level = levelFor(e.context.percent)
    if (level === 'ok') warned = false
    else if (shouldToast(level, warned)) {
      warned = true
      $.ui.toast(`Context at ${e.context.percent}%: consider wrapping up and compacting soon.`)
    }
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    if (level !== 'compact') return r
    return {
      ...r,
      sections: [...r.sections, { id: 'context-guardian:compact', text: COMPACT_SECTION_TEXT, scope: 'session' as const }],
    }
  })
}
