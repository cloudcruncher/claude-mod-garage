import { expect, test } from 'claude-code/testing'

test('toast after a long turn that used tools', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_$: any, e: any) => { toasts.push(e.text ?? e.message ?? JSON.stringify(e)); return { value: undefined } })
  on('tool.call', () => ({ result: 'ran' }))
  await $.turn.start({ turnId: 't1' } as any).catch(() => {})
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.turn.complete({ turnId: 't1', answer: '', durationMs: 45000 } as any).catch(() => {})
  expect(toasts.join(' ')).toMatch(/Turn done in 45s · 1 tool call/)
})
