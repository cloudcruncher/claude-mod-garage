import { START, MAP, move, nextSeed, render, shoot, spawnEnemies, turn, wander } from './raycast'
import type { Enemy, Player } from './raycast'

type St = { p: Player; enemies: Enemy[]; seed: number; kills: number; msg: string; flash: number }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

function fresh(): St {
  return { p: START, enemies: spawnEnemies(), seed: 12345, kills: 0, msg: 'Find the @ and press space.', flash: 0 }
}

// Surface module: owns the game loop (50 ms ~ 20 fps) and key handling.
export default function Doom(_props: unknown, surface: any) {
  const { Box, Text } = surface.elements
  let st: St = surface.state ?? fresh()

  if (surface.state === undefined) {
    surface.setState(st)
    const update = (fn: (s: St) => St) => surface.setState(fn(surface.state ?? st))
    surface.every(50, () =>
      update(s => {
        let seed = s.seed
        const rng = () => {
          seed = nextSeed(seed)
          return seed / 4294967296
        }
        const enemies = wander(MAP, s.enemies, rng)
        return { ...s, enemies, seed, flash: Math.max(0, s.flash - 1) }
      }),
    )
    surface.onKey((k: { key: string }) =>
      update(s => {
        switch (k.key) {
          case 'w':
          case 'up':
            return { ...s, p: move(MAP, s.p, 0.25) }
          case 's':
          case 'down':
            return { ...s, p: move(MAP, s.p, -0.25) }
          case 'a':
            return { ...s, p: move(MAP, s.p, 0, -0.25) }
          case 'd':
            return { ...s, p: move(MAP, s.p, 0, 0.25) }
          case 'left':
            return { ...s, p: turn(s.p, -0.15) }
          case 'right':
            return { ...s, p: turn(s.p, 0.15) }
          case ' ':
          case 'space': {
            const i = shoot(MAP, s.p, s.enemies)
            if (i < 0) return { ...s, msg: 'Miss.', flash: 3 }
            const enemies = s.enemies.map((e, j) => (j === i ? { ...e, alive: false } : e))
            const kills = s.kills + 1
            return { ...s, enemies, kills, msg: enemies.some(e => e.alive) ? 'Hit!' : 'All clear. Press q to leave.', flash: 3 }
          }
          case 'q':
            surface.post({ type: 'close' })
            return s
          default:
            return s
        }
      }),
    )
  }

  const cols = clamp((surface.columns || 60) - 1, 24, 120)
  const rows = clamp((surface.rows || 20) - 3, 8, 40)
  const lines = render(MAP, st.p, cols, rows, st.enemies)
  return (
    <Box flexDirection="column">
      {lines.map((l: string) => (
        <Text>{l}</Text>
      ))}
      <Text dimColor>{`WASD/arrows move, space shoot, q quit | kills ${st.kills}/${st.enemies.length} | ${st.msg}`}</Text>
    </Box>
  )
}
