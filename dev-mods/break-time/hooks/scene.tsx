import { renderScene } from './timing'

type Props = { breakMin: number; n: number }
type St = { tick: number; n: number }

// Surface module: runs on the drawing thread. tick advances every 250 ms.
export default function Scene(props: Props, surface: any) {
  const { Box, Text } = surface.elements
  const st: St | undefined = surface.state
  if (st === undefined || st.n !== props.n) {
    surface.setState({ tick: 0, n: props.n })
    if (st === undefined) {
      surface.every(250, () => {
        const cur: St = surface.state ?? { tick: 0, n: props.n }
        surface.setState({ ...cur, tick: cur.tick + 1 })
      })
    }
  }
  const tick = st?.tick ?? 0
  const lines = renderScene(tick, surface.columns || 60, Math.floor(tick / 4), props.breakMin)
  return (
    <Box flexDirection="column">
      {lines.map(l => (
        <Text>{l === '' ? ' ' : l}</Text>
      ))}
    </Box>
  )
}
