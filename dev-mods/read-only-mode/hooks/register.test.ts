import { expect, test } from 'claude-code/testing'

test('edits and mutating commands are refused only while on', async ($, on) => {
  on('command.register', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('tool.call', () => ({ result: 'ran' }))
  const edit = (): Promise<any> => $.tool.call({ tool: 'Edit', file_path: '/a', old_string: 'a', new_string: 'b' })
  const bash = (command: string): Promise<any> => $.tool.call({ tool: 'Bash', command })
  expect((await edit()).result).toBe('ran')
  await $.command.run({ command: 'readonly', args: 'on' })
  expect((await edit()).deny).toMatch(/Read-only/)
  expect((await bash('rm x')).deny).toMatch(/Read-only/)
  expect((await bash('git status')).result).toBe('ran')
  await $.command.run({ command: 'readonly', args: 'off' })
  expect((await bash('rm x')).result).toBe('ran')
})
