import { expect, test } from 'claude-code/testing'

test('fourth identical call is refused, a different one is not', async ($, on) => {
  on('ui.toast', () => ({ value: undefined }))
  on('tool.call', () => ({ result: 'ran' }))
  const run = (command: string): Promise<any> => $.tool.call({ tool: 'Bash', command })
  expect((await run('ls')).result).toBe('ran')
  expect((await run('ls')).result).toBe('ran')
  expect((await run('ls')).result).toBe('ran')
  expect((await run('ls')).deny).toMatch(/3 times in a row/)
  expect((await run('pwd')).result).toBe('ran')
})

test('a new turn resets the streak, and polling commands are allowed', async ($, on) => {
  on('ui.toast', () => ({ value: undefined }))
  on('tool.call', () => ({ result: 'ran' }))
  const run = (command: string): Promise<any> => $.tool.call({ tool: 'Bash', command })
  for (let i = 0; i < 6; i++) expect((await run('git status')).result).toBe('ran')
  await run('ls')
  await run('ls')
  await run('ls')
  await $.turn.start({ turnId: 't1' } as any).catch(() => {})
  expect((await run('ls')).result).toBe('ran')
})
