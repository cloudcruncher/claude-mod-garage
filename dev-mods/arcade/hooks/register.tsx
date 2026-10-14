import type { Register } from 'claude-code'

const GAMES = {
  doom: { title: 'Doom', module: './doom.tsx', description: 'Play a tiny text-mode raycaster (WASD, space, q)' },
  snake: { title: 'Snake', module: './snake.tsx', description: 'Play snake in a pane (WASD, q)' },
} as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    for (const [name, g] of Object.entries(GAMES)) {
      await $.command.register({ name, description: g.description })
    }
    return next(e)
  })

  on('command.run', { command: 'doom' }, async $ => {
    await $.ui.open({ id: 'doom', title: 'Doom', focus: true, closeOnEscape: true, rows: 26 })
    return { text: 'Doom opened. WASD/arrows to move, space to shoot, q to quit.' }
  })

  on('command.run', { command: 'snake' }, async $ => {
    await $.ui.open({ id: 'snake', title: 'Snake', focus: true, closeOnEscape: true, rows: 16 })
    return { text: 'Snake opened. WASD/arrows to steer, q to quit.' }
  })

  on('ui.render', { component: 'Pane', requestId: 'doom' }, async ($, e) => {
    const { Box, Client } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Client key="doom" module="./doom.tsx" />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: 'snake' }, async ($, e) => {
    const { Box, Client } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Client key="snake" module="./snake.tsx" />
      </Box>
    )
  })

  // The game modules post { type: 'close' } on q.
  on('ui.message', async ($, e, next) => {
    if ((e.data as { type?: string } | null)?.type === 'close') {
      await $.ui.close({ id: e.requestId })
      return {}
    }
    return next(e)
  })
}
