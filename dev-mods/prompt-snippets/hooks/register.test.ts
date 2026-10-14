import { expect, test } from 'claude-code/testing'

test('/snippets lists the shortcuts', async ($, on) => {
  on('command.register', () => ({ value: undefined }))
  const out: any = await $.command.run({ command: 'snippets', args: '' })
  expect(out.text).toContain(';review')
})
