import type { Register } from 'claude-code'
import { lines, parse, type Peer } from './lib'

let rows: string[] = []

async function refresh($: any) {
  const home = (await $.process.run(['printenv', 'HOME']).catch(() => undefined))?.stdout.trim()
  if (!home) return
  const dir = `${home}/.claude/sessions`
  const entries = await $.fs.list(dir).catch(() => [])
  const peers: Peer[] = []
  for (const f of entries) {
    if (!f.name.endsWith('.json')) continue
    const text = await $.fs.read(`${dir}/${f.name}`).catch(() => undefined)
    const p = text && parse(text)
    if (p) peers.push(p)
  }
  let live = peers
  if (peers.length) {
    const ps = await $.process.run(['ps', '-o', 'pid=', '-p', peers.map(p => p.pid).join(',')]).catch(() => undefined)
    const alive = new Set((ps?.stdout ?? '').split(/\s+/).filter(Boolean).map(Number))
    live = peers.filter(p => alive.has(p.pid))
  }
  const self = await $.session.id()
  const next = live.length > 1 ? lines(live, Date.now(), self) : []
  if (next.join('\n') !== rows.join('\n')) {
    rows = next
    $.ui.invalidate('ui.render')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(5_000, () => refresh($))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (!rows.length || e.props.hasSurvey) return theirs
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {theirs}
        {rows.map(r => <Text dimColor>{r}</Text>)}
      </Box>
    )
  })
}
