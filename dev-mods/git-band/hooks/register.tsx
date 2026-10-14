import type { Register } from 'claude-code'
import { format, parse, type GitInfo } from './lib'

let info: GitInfo | undefined

async function refresh($: any) {
  const r = await $.process.run(['git', 'status', '--porcelain=v1', '-b'], { timeoutMs: 5000 }).catch(() => undefined)
  const next = r && r.exitCode === 0 ? parse(r.stdout) : undefined
  if (JSON.stringify(next) !== JSON.stringify(info)) {
    info = next
    $.ui.invalidate('ui.render')
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(15_000, () => refresh($))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (!info || e.props.hasSurvey) return theirs
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {theirs}
        <Text dimColor>{format(info)}</Text>
      </Box>
    )
  })
}
