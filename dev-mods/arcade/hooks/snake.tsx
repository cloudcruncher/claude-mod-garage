import { newGame, renderSnake, step, turnTo } from './snake'
import type { Dir, Snake } from './snake'

const KEYS: Record<string, Dir> = { w: 'up', up: 'up', s: 'down', down: 'down', a: 'left', left: 'left', d: 'right', right: 'right' }

export default function SnakeGame(_props: unknown, surface: any) {
  const { Box, Text } = surface.elements
  const st: Snake = surface.state ?? newGame(24, 12)

  if (surface.state === undefined) {
    surface.setState(st)
    const update = (fn: (s: Snake) => Snake) => surface.setState(fn(surface.state ?? st))
    surface.every(140, () => update(step))
    surface.onKey((k: { key: string }) => {
      if (k.key === 'q') surface.post({ type: 'close' })
      else if (k.key === 'r') update(s => newGame(s.w, s.h, s.seed + 1))
      else if (KEYS[k.key]) update(s => turnTo(s, KEYS[k.key]))
    })
  }

  return (
    <Box flexDirection="column">
      {renderSnake(st).map(l => (
        <Text>{l}</Text>
      ))}
      <Text dimColor>{st.alive ? `score ${st.score} | WASD/arrows, q quit` : `Game over, score ${st.score} | r restart, q quit`}</Text>
    </Box>
  )
}
