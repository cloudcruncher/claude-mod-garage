export type Peer = {
  pid: number
  sessionId: string
  name: string
  kind: string
  status: string
  startedAt: number
}

export function parse(text: string): Peer | undefined {
  try {
    const j = JSON.parse(text)
    if (typeof j.pid !== 'number' || typeof j.sessionId !== 'string') return undefined
    return {
      pid: j.pid,
      sessionId: j.sessionId,
      name: typeof j.name === 'string' && j.name ? j.name : `pid-${j.pid}`,
      kind: typeof j.kind === 'string' ? j.kind : 'unknown',
      status: typeof j.status === 'string' ? j.status : 'unknown',
      startedAt: typeof j.startedAt === 'number' ? j.startedAt : 0,
    }
  } catch {
    return undefined
  }
}

export function ago(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return 'just now'
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'} ago`
  if (s < 3600) return unit(Math.floor(s / 60), 'minute')
  if (s < 86400) return unit(Math.floor(s / 3600), 'hour')
  return unit(Math.floor(s / 86400), 'day')
}

export function format(p: Peer, now: number, self?: string): string {
  const mark = p.sessionId === self ? ' · this one' : ''
  const age = p.startedAt ? `started ${ago(now - p.startedAt)}` : 'start unknown'
  return `${p.name} (ref ${p.sessionId.replace(/-/g, '').slice(0, 6)}, ${p.kind}, ${p.status}, ${age})${mark}`
}

export function lines(peers: Peer[], now: number, self?: string, max = 6): string[] {
  const sorted = [...peers].sort((a, b) => b.startedAt - a.startedAt)
  const shown = sorted.slice(0, max).map(p => format(p, now, self))
  if (sorted.length > max) shown.push(`+${sorted.length - max} more`)
  return shown
}
