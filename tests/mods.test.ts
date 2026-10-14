import { expect, mock, test } from 'claude-code/testing'

function stubs(on: any, saved: Map<string, unknown>, answer: string) {
  const clock = mock.clock(on)
  on('store.get', ($: any, e: any) => ({ value: saved.get(e.key) }))
  on('store.set', ($: any, e: any) => { saved.set(e.key, e.value); return { value: undefined } })
  on('session.id', () => ({ value: 'aaaaaaaa-1111' }))
  on('session.cwd', () => ({ value: '/work' }))
  on('session.model', () => ({ value: 'sonnet' }))
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))
  on('tool.call', ($: any, e: any) => e.tool === 'AskUserQuestion'
    ? { result: { answers: { [e.questions[0].question]: answer } } }
    : { result: 'ran' })
  return clock
}

test('risky command refused when user says Refuse', async ($, on) => {
  stubs(on, new Map(), 'Refuse')
  const out: any = await $.tool.call({ tool: 'Bash', command: 'rm -rf src' })
  expect(out.deny).toMatch(/declined/)
})

test('risky command runs when user says Run it', async ($, on) => {
  stubs(on, new Map(), 'Run it')
  const out: any = await $.tool.call({ tool: 'Bash', command: 'git reset --hard' })
  expect(out.result).toBe('ran')
})

test('safe command passes without question', async ($, on) => {
  stubs(on, new Map(), 'Refuse')
  const out: any = await $.tool.call({ tool: 'Bash', command: 'ls -la' })
  expect(out.result).toBe('ran')
})

test('/peers lists other sessions and /tell delivers', async ($, on) => {
  const saved = new Map<string, unknown>([['peers', { 'bbbbbbbb-2222': { t: 0, cwd: '/other', model: 'opus' } }]])
  stubs(on, saved, 'Run it')
  let sentTo = ''
  on('session.send', ($: any, e: any) => { sentTo = String(e.to); return { isDelivered: true } })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const peers: any = await $.command.run({ command: 'peers', args: '' })
  expect(peers.text).toContain('bbbbbbbb')
  const tell: any = await $.command.run({ command: 'tell', args: 'bbbb hello there' })
  expect(tell.text).toContain('Sent')
  expect(sentTo).toContain('bbbbbbbb-2222')
})

test('summary is stored after a turn and pane draws pet + peers', async ($, on) => {
  const saved = new Map<string, unknown>()
  const clock = stubs(on, saved, 'Run it')
  on('session.messages', () => ({ value: [{ role: 'user', text: 'fix the dbt model', toolUses: [] }] }))
  on('session.usage', () => ({ value: { context: { percent: 42 }, rateLimits: [{ kind: 'five_hour', percentUsed: 85 }] } }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Fixing a dbt model', usage: {} } }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  await $.turn.complete({ turnId: 't', answer: 'ok', durationMs: 1000, isAborted: false, usage: null })
  await clock.advance(2500)
  expect((saved.get('peers') as any)['aaaaaaaa-1111'].summary).toBe('Fixing a dbt model')
  await $.command.run({ command: 'live', args: '' })
  const ui = await $.ui.mount({ plugin: 'robin-mods', component: 'Pane', requestId: 'live', surface: 'terminal', viewport: { columns: 100, rows: 30 }, props: { title: 'Live', isFocused: true, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 10 }, view: {} } } as any)
  expect(await ui.find({ type: 'Text', text: /5h .* 85%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Fixing a dbt model/ })).toBeDefined()
})
