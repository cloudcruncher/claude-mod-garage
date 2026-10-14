import type { Register } from 'claude-code'
import { clip, filesTouched, finish, fmtDur, label, bar, lastCalls, nextLive, preview, running, sayText, start, type Call, type Live } from './lib'

const PANE = 'radar'
// Engine bookkeeping calls that are noise in a view of what the agents are doing.
const INTERNAL = new Set(['SubagentHandback'])

export const register: Register = (on, options) => {
  let calls: Call[] = []
  // The latest thing each loop wrote to the conversation, keyed by agent id ('main' for the main loop).
  let says: Record<string, string> = {}
  // What each loop is doing between tool calls (thinking, writing, starting a call), from the response stream.
  let liveState: Record<string, Live> = {}
  let turnStart = 0
  let ctxAtTurnStart: number | undefined
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

  on('prompt.submit', async ($, e, next) => {
    turnStart = await $.clock.now()
    ctxAtTurnStart = (await $.session.usage().catch(() => undefined))?.context?.percent
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    if (INTERNAL.has(e.tool)) return next(e)
    const now = await $.clock.now()
    const args = e as unknown as Record<string, unknown>
    calls = start(calls, { id: e.tool_use_id, agentId: e.agentId, tool: e.tool, label: label(e.tool, args), start: now })
    $.ui.invalidate('ui.render')
    const out = await next(e)
    const failed = ('isError' in out && out.isError === true) || ('deny' in out && !!out.deny)
    const text = 'deny' in out && out.deny ? out.deny : 'text' in out ? out.text : ''
    // An Agent call's own result is launch bookkeeping; the agent's rows tell the real story.
    calls = finish(calls, e.tool_use_id, await $.clock.now(), failed, e.tool === 'Agent' ? '' : preview(text, 90, failed))
    $.ui.invalidate('ui.render')
    return out
  }).catch(($, e, next) => next(e))

  // What the model writes to you (its visible messages). Thinking blocks are never read.
  on('session.append', { door: 'response' }, ($, e, next) => {
    const text = sayText(e.message.content)
    if (text) {
      says = { ...says, [e.agentId ?? 'main']: clip(text, 400) }
      $.ui.invalidate('ui.render')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The model's response as it streams. Text is shown live, thinking only as "thinking"; every chunk passes on untouched.
  on('turn.step', async function* ($, e, next) {
    const key = e.agentId ?? 'main'
    liveState = { ...liveState, [key]: { phase: 'waiting', since: await $.clock.now(), text: '' } }
    $.ui.invalidate('ui.render')
    const stream = next(e)
    try {
      for (;;) {
        const it = await stream.next()
        if (it.done) return it.value
        const c = it.value as { kind: string; text?: string; name?: string }
        if (c.kind === 'text' || c.kind === 'thinking' || c.kind === 'tool') {
          const before = liveState[key]
          const after = nextLive(before, c, await $.clock.now())
          liveState = { ...liveState, [key]: after }
          if (!before || before.phase !== after.phase) $.ui.invalidate('ui.render')
        }
        yield it.value
      }
    } finally {
      const { [key]: _gone, ...rest } = liveState
      liveState = rest
      $.ui.invalidate('ui.render')
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    isOpen = true
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const agents = await $.agent.list()
    const usage = await $.session.usage().catch(() => undefined)
    const live = running(calls)
    const busy = live.length + Object.keys(liveState).length
    const spawned = calls.filter(c => c.tool === 'Agent').length
    const rows = Math.max(8, (e.viewport?.rows ?? 30) - 4)
    const recent = calls.slice(-Math.max(4, Math.floor(rows / 3))).reverse()
    const files = filesTouched(calls).slice(0, 5)
    const ctx = usage?.context?.percent
    const five = usage?.rateLimits?.find(r => /five|5/.test(String(r.kind)))?.percentUsed
    const mark = (c: Call) => (c.end === undefined ? '▶' : c.isError ? '✗' : '✓')
    const age = (c: Call) => fmtDur((c.end ?? now) - c.start)
    const mainSays = says.main

    return (
      <Box flexDirection="column">
        <Text bold>{busy ? `● working (${live.length} tool${live.length === 1 ? '' : 's'} running)` : '○ idle'}{turnStart ? `  ·  turn ${fmtDur(now - turnStart)}` : ''}  ·  {calls.length} calls{five !== undefined ? `  ·  5h ${Math.round(five)}%` : ''}</Text>
        {ctx !== undefined && <Text color={ctx >= 85 ? 'red' : ctx >= 70 ? 'yellow' : undefined}>ctx {bar(ctx)} {Math.round(ctx)}%{ctxAtTurnStart !== undefined && ctx - ctxAtTurnStart >= 1 ? `  (+${Math.round(ctx - ctxAtTurnStart)}% this turn)` : ''}</Text>}
        <Text> </Text>
        <Text bold>Now</Text>
        {Object.entries(liveState).map(([k, l]) => (
          <Text wrap="wrap" color="cyan">● {k === 'main' ? 'main' : `[${k.slice(0, 4)}]`} {l.phase === 'thinking' ? 'thinking…' : l.phase === 'writing' ? `writing: “${clip(l.text, 160)}”` : l.phase === 'calling' ? `starting ${l.tool ?? 'a tool'}…` : 'waiting for the model…'}  {fmtDur(now - l.since)}</Text>
        ))}
        {live.length === 0 && Object.keys(liveState).length === 0 && <Text dimColor>  idle</Text>}
        {live.slice(-4).map(c => (
          <Text wrap="wrap" color="yellow">▶ {c.agentId ? `[${c.agentId.slice(0, 4)}] ` : ''}{c.tool} {clip(c.label, 140)}  {age(c)}</Text>
        ))}
        {mainSays && <Text wrap="wrap" dimColor>  “{clip(mainSays, 220)}”</Text>}
        <Text> </Text>
        <Text bold>Agents  ({spawned} spawned)</Text>
        {agents.length === 0 && <Text dimColor>  {spawned ? `${spawned} finished, none running` : 'none spawned'}</Text>}
        {agents.slice(-5).map(a => {
          const recentCalls = lastCalls(calls, a.id, 3)
          const said = says[a.id]
          return (
            <Box flexDirection="column">
              <Text wrap="truncate" dimColor={a.status !== 'running'}>{a.status === 'running' ? '▶' : '·'} {a.type} · {a.description}</Text>
              {recentCalls.map(c => <Text wrap="truncate" dimColor>    {mark(c)} {c.tool} {c.label}  {age(c)}</Text>)}
              {said && <Text wrap="truncate" dimColor>    “{clip(said, 120)}”</Text>}
            </Box>
          )
        })}
        <Text> </Text>
        <Text bold>Activity</Text>
        {recent.length === 0 && <Text dimColor>  nothing yet</Text>}
        {recent.map(c => (
          <Box flexDirection="column">
            <Text wrap="truncate" dimColor={c.end !== undefined && !c.isError} color={c.isError ? 'red' : undefined}>
              {mark(c)} {c.agentId ? `[${c.agentId.slice(0, 4)}] ` : ''}{c.tool} {c.label}  {age(c)}
            </Text>
            {c.out ? <Text wrap="truncate" dimColor color={c.isError ? 'red' : undefined}>    → {c.out}</Text> : null}
          </Box>
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
