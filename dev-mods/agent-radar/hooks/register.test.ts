import { expect, test } from 'claude-code/testing'

test('/radar opens the pane', async ($, on) => {
  let opened = ''
  on('command.register', () => ({ value: undefined }))
  on('ui.open', (_$: any, e: any) => { opened = e.id; return { value: { isPlaced: true } } })
  const out: any = await $.command.run({ command: 'radar', args: '' })
  expect(opened).toBe('radar')
  expect(out.text).toMatch(/Radar opened/)
})
