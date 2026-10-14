import type { Register } from 'claude-code'
import { add, fromTool, render, type Entry } from './lib'

export const register: Register = on => {
  let entries: Entry[] = []
  let startedAt = 0

  on('session.start', async ($, e, next) => {
    startedAt = await $.clock.now()
    await $.command.register({ name: 'journal', description: 'Write a markdown timeline of this session to .claude/journal/' })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    entries = add(entries, { kind: 'prompt', at: await $.clock.now(), text: String(e.text ?? '') })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const entry = fromTool(e.tool, e as unknown as Record<string, unknown>, await $.clock.now())
    if (entry) entries = add(entries, entry)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'journal' }, async $ => {
    if (entries.length === 0) return { text: 'Nothing to journal yet.' }
    const stamp = new Date(startedAt || (await $.clock.now())).toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const path = `.claude/journal/${stamp}.md`
    await $.fs.write(path, render(entries, `Session ${stamp.replace(/-(\d\d)-(\d\d)$/, ' $1:$2')}`))
    return { text: `Journal written to ${path} (${entries.length} entries).` }
  })
}
