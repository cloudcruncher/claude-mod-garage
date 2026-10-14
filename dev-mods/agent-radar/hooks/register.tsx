import type { Register } from 'claude-code'
import { filesTouched, finish, fmtDur, label, latestFor, running, start, type Call } from './lib'

const PANE = 'radar'
// Engine bookkeeping calls that are noise in a view of what the agents are doing.
const INTERNAL = new Set(['SubagentHandback'])

export const register: Register = (on, options) => {
  let calls: Call[] = []
  let isOpen = false
  const autoOpen = options?.autoOpen === true

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'radar', description: 'Open the live pane showing what Claude and its subagents are doing' })
    // Redraw once a second so elapsed times tick; only while the pane is open.
    $.clock.every(1000, () => { if (isOpen) $.ui.invalidate('ui.render') })
    if (autoOpen) { isOpen = true; void $.ui.open({ id: PANE, title: 'Agent radar' }) }
    return next(e)
  })

  on('command.run', { command: 'radar' }, async $ => {
    isOpen = true
    await $.ui.open({ id: PANE, title: 'Agent radar' })
    return { text: 'Radar opened. Esc closes it.' }
  })

  on('tool.call', async ($, e, next) => {
    if (INTERNAL.has(e.tool)) return next(e)
    const now = await $.clock.now()
    const args = e as unknown as Record<string, unknown>
    calls = start(calls, { id: e.tool_use_id, agentId: e.agentId, tool: e.tool, label: label(e.tool, args), start: now })
    $.ui.invalidate('ui.render')
    const out = await next(e)
    calls = finish(calls, e.tool_use_id, await $.clock.now(), 'isError' in out && out.isError === true || 'deny' in out && !!out.deny)
    $.ui.invalidate('ui.render')
    return out
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const agents = await $.agent.list()
    const live = running(calls)
    const spawned = calls.filter(c => c.tool === 'Agent').length
    const rows = Math.max(6, (e.viewport?.rows ?? 30) - 4)
    const recent = calls.slice(-Math.max(5, Math.floor(rows / 2))).reverse()
    const files = filesTouched(calls).slice(0, 5)
    const mark = (c: Call) => (c.end === undefined ? '▶' : c.isError ? '✗' : '✓')
    const age = (c: Call) => fmtDur((c.end ?? now) - c.start)

    return (
      <Box flexDirection="column">
        <Text bold>{live.length ? `● ${live.length} running` : '○ idle'}  ·  {calls.length} calls  ·  {agents.filter(a => a.status === 'running').length} agents active  ·  {spawned} spawned</Text>
        <Text> </Text>
        <Text bold>Agents</Text>
        {agents.length === 0 && <Text dimColor>  {spawned ? `${spawned} finished, none running` : 'none spawned'}</Text>}
        {agents.slice(-6).map(a => {
          const last = latestFor(calls, a.id)
          return (
            <Text wrap="truncate" dimColor={a.status !== 'running'}>
              {a.status === 'running' ? '▶' : '·'} {a.type} · {a.description}{last ? `  → ${last.tool} ${last.label}` : ''}
            </Text>
          )
        })}
        <Text> </Text>
        <Text bold>Activity</Text>
        {recent.length === 0 && <Text dimColor>  nothing yet</Text>}
        {recent.map(c => (
          <Text wrap="truncate" dimColor={c.end !== undefined && !c.isError} color={c.isError ? 'red' : undefined}>
            {mark(c)} {c.agentId ? `[${c.agentId.slice(0, 4)}] ` : ''}{c.tool} {c.label}  {age(c)}
          </Text>
        ))}
        {files.length > 0 && <Text> </Text>}
        {files.length > 0 && <Text bold>Files touched</Text>}
        {files.map(f => (
          <Text wrap="truncate">  {f.path}{f.count > 1 ? ` ×${f.count}` : ''}</Text>
        ))}
      </Box>
    )
  })
}
