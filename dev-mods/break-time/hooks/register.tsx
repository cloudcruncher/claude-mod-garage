import type { Register } from 'claude-code'

import { advance, initialState, isDue, reset, snooze } from './timing'
import type { BreakState, Config } from './timing'

const PANE = 'coffee-break'
const TICK_MS = 60_000

export const register: Register = (on, options) => {
  const cfg: Config = {
    intervalMin: Number(options?.intervalMinutes ?? 150),
    breakMin: Number(options?.breakMinutes ?? 5),
    snoozeMin: 15,
  }
  let state: BreakState = initialState()
  let lastActivity = 0
  let lastBreak = 0
  let shown = 0 // bumps on each open, resets the animation

  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    lastActivity = now
    const saved: any = await $.store.get('break')
    lastBreak = saved?.lastBreak ?? now
    // Carry active time over a quick restart only (under 30 min gap).
    if (saved && now - saved.savedAt < 30 * 60_000) state = { ...state, activeMs: saved.activeMs ?? 0 }
    for (const [name, description] of [
      ['break', 'Start a coffee break now'],
      ['break-skip', 'Snooze the break reminder for 15 minutes'],
      ['break-done', 'Reset the break timer'],
    ]) {
      await $.command.register({ name, description })
    }
    $.clock.every(TICK_MS, async () => {
      const now2 = await $.clock.now()
      state = advance(state, TICK_MS, now2 - lastActivity)
      if (isDue(state, cfg)) {
        state = snooze(state, cfg) // re-arm so we do not nag every minute
        $.ui.toast('Time for a coffee break. Run /break (or /break-skip to snooze).')
        shown += 1
        await $.ui.open({ id: PANE, title: 'Coffee break', closeOnEscape: true })
      }
      await $.store.set('break', { lastBreak, activeMs: state.activeMs, savedAt: now2 })
    })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    lastActivity = await $.clock.now()
    return next(e)
  })

  on('command.run', { command: 'break' }, async $ => {
    shown += 1
    await $.ui.open({ id: PANE, title: 'Coffee break', closeOnEscape: true })
    return { text: 'Coffee break started.' }
  })
  on('command.run', { command: 'break-skip' }, async $ => {
    state = snooze(state, cfg)
    await $.ui.close({ id: PANE })
    return { text: `Snoozed for ${cfg.snoozeMin} minutes of active time.` }
  })
  on('command.run', { command: 'break-done' }, async $ => {
    state = reset()
    lastBreak = await $.clock.now()
    await $.store.set('break', { lastBreak, activeMs: 0, savedAt: lastBreak })
    await $.ui.close({ id: PANE })
    return { text: 'Break timer reset. Welcome back.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Client } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Client key="scene" module="./scene.tsx" props={{ breakMin: cfg.breakMin, n: shown }} />
      </Box>
    )
  })
}
