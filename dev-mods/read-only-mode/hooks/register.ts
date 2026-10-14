import type { Register } from 'claude-code'
import { EDIT_TOOLS, isReadOnlyCommand } from './lib'

export const register: Register = on => {
  let isOn = false

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'readonly', description: 'Look-but-don\'t-touch mode: /readonly on | off | status', argumentHint: 'on|off|status' })
    return next(e)
  })

  on('command.run', { command: 'readonly' }, ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg === 'on') isOn = true
    else if (arg === 'off') isOn = false
    else if (arg !== 'status' && arg !== '') return { text: 'Usage: /readonly on | off | status' }
    $.ui.status(isOn ? '🔒 read-only' : undefined)
    return { text: isOn ? 'Read-only mode ON: edits and mutating commands are refused.' : 'Read-only mode OFF.' }
  })

  on('tool.call', ($, e, next) => {
    if (!isOn) return next(e)
    if (EDIT_TOOLS.includes(e.tool)) {
      return { deny: 'Read-only mode is on (the user ran /readonly on). Do not edit files; describe the change instead.' }
    }
    if (e.tool === 'Bash' && !isReadOnlyCommand(String(e.command ?? ''))) {
      return { deny: 'Read-only mode is on. Only read-only commands (ls, cat, grep, git status/log/diff...) may run. Ask the user to run /readonly off if this command is needed.' }
    }
    return next(e)
  }).catch(($, e, next) => ({ deny: `read-only-mode failed (${next.error.kind}); call not run.` }))
}
