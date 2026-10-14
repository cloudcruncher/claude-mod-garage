import { expect, mock, test } from 'claude-code/testing'

test('/break-done resets the timer and persists it', async ($, on) => {
  const saved = new Map<string, unknown>()
  const clock = mock.clock(on)
  on('store.get', ($: any, e: any) => ({ value: saved.get(e.key) }))
  on('store.set', ($: any, e: any) => { saved.set(e.key, e.value); return { value: undefined } })
  on('command.register', () => ({ value: undefined }))
  let toasts = 0
  let opened = 0
  on('ui.toast', () => { toasts += 1; return {} })
  on('ui.open', () => { opened += 1; return { value: { isPlaced: true } } })
  on('ui.close', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.prompt.submit({ text: 'hi' } as any).catch(() => {})
  await clock.advance(60_000)
  expect(opened).toBe(0)
  const done: any = await $.command.run({ command: 'break-done', args: '' })
  expect(done.text).toMatch(/reset/)
  expect((saved.get('break') as any).activeMs).toBe(0)
  expect(toasts).toBe(0)
})
