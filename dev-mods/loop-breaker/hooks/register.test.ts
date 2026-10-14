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
