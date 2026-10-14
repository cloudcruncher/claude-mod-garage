import { expect, mock, test } from 'claude-code/testing'

test('/journal writes the timeline file', async ($, on) => {
  mock.clock(on)
  on('session.start', () => ({ cwd: '/work' }))
  const written: Record<string, string> = {}
  on('command.register', () => ({ value: undefined }))
  on('fs.write', (_$: any, e: any) => { written[e.path] = e.text; return { value: undefined } })
  on('tool.call', () => ({ result: 'ran' }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.prompt.submit({ text: 'do it' } as any).catch(() => {})
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  const out: any = await $.command.run({ command: 'journal', args: '' })
  expect(out.text).toMatch(/Journal written to \.claude\/journal\//)
  expect(Object.values(written).join('')).toContain('ran `ls`')
})
