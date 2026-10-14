import type { Register } from 'claude-code'
import { DEFAULTS, expand, parseExtra } from './lib'

export const register: Register = (on, options) => {
  const snippets = { ...DEFAULTS, ...parseExtra(options?.extraSnippets) }

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'snippets', description: 'List the ;snippet shortcuts you can type in a prompt' })
    return next(e)
  })

  on('command.run', { command: 'snippets' }, () => ({
    text: Object.entries(snippets).map(([k, v]) => `;${k}  ${v.length > 70 ? v.slice(0, 69) + '…' : v}`).join('\n'),
  }))

  on('prompt.submit', (_$, e, next) => {
    const text = expand(String(e.text ?? ''), snippets)
    return next(text === e.text ? e : { ...e, text })
  }).catch(($, e, next) => next(e))
}
