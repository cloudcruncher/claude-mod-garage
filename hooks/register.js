// Each rule: [label, regex]. First match wins; the label is shown in the prompt so you know why it flagged.
const SAFE_RM = /^(\.\/)?(node_modules|dist|build|out|coverage|__pycache__|\.cache|\.next|\.turbo|\.pytest_cache|\.venv|target|tmp)\/?$/
const RULES = [
  ['DESTRUCTIVE: force/recursive delete', /\brm\s+(-[a-z]*\s+)*-[a-z]*(r[a-z]*f|f[a-z]*r)[a-z]*\b/i],
  ['DESTRUCTIVE: discards uncommitted work', /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s+\.|restore\s+\.)/i],
  ['DESTRUCTIVE: force push', /\bgit\s+push\b.*(--force|\s-f\b)/i],
  ['DESTRUCTIVE: drops data', /\bdrop\s+(table|database|schema)\b|\btruncate\s+table\b/i],
  ['PROD: dbt against prod', /\bdbt\s+(run|build|seed)\b.*--target\s+prod/i],
  ['PUBLISH: pushes code to a remote', /\bgit\s+push\b/i],
  ['PUBLISH: releases a package or image', /\b(npm|pnpm|yarn)\s+publish\b|\buv\s+publish\b|\btwine\s+upload\b|\bdocker\s+push\b|\bcargo\s+publish\b|\bgh\s+release\s+(create|upload)\b/i],
  ['PUBLISH: makes content public', /\bgh\s+(gist\s+create\b.*--public|repo\s+(create\b.*--public|edit\b.*--visibility\s+public))|\bgh\s+pr\s+(create|merge)\b/i],
  ['PUBLISH: deploys or uploads a site', /\b(vercel|netlify|wrangler|firebase|surge|gh-pages)\b.*\b(deploy|publish)\b|\baws\s+s3\s+(sync|cp|mv)\b.*(--acl\s+public|s3:\/\/)|\bscp\b|\brsync\b.*:/i],
]
// Heredoc bodies are data (a doc, a script written to disk), not commands, unless piped into a shell.
function stripHeredocs(cmd) {
  return cmd.replace(/^(.*?)<<-?\s*(['"]?)(\w+)\2[^\n]*\n[\s\S]*?\n\s*\3[ \t]*$/gm, (m, head) =>
    /\b(ba|z|da)?sh\b\s*(-s|-)?\s*$/.test(head.trim()) ? m : head)
}
function classify(cmd) {
  cmd = stripHeredocs(cmd)
  const rm = cmd.match(/\brm\s+(.*)/)
  if (rm && /-[a-z]*r/i.test(rm[1])) {
    const targets = rm[1].split(/\s+/).filter(t => t && !t.startsWith('-') && !/^[;&|]/.test(t))
    if (targets.length && targets.every(t => SAFE_RM.test(t))) cmd = cmd.replace(/\brm\b/g, 'rm-safe')
  }
  for (const [label, re] of RULES) if (re.test(cmd)) return label
  return null
}
const PEERS = 'peers'
let me = ''
let working = false
let usage = { ctx: 0, five: 0 }
let tick = 0
let peerCache = {}
const PANE = 'live'
const STALE_MS = 6 * 3600 * 1000

async function heartbeat($) {
  const id = await $.session.id()
  const all = (await $.store.get(PEERS)) || {}
  const now = await $.clock.now()
  for (const k of Object.keys(all)) if (now - all[k].t > STALE_MS) delete all[k]
  all[id] = { t: now, cwd: await $.session.cwd(), model: String(await $.session.model()), summary: (all[id] || {}).summary || '' }
  await $.store.set(PEERS, all)
  return all
}

function pet() {
  const f = tick % 2
  if (usage.five >= 90 || usage.ctx >= 90) return f ? '(x_x)' : '(>_<)'
  if (usage.five >= 80 || usage.ctx >= 80) return f ? '(;°o°)' : '(;°O°)'
  if (working) return ['(ง •̀_•́)ง', '(ง •̀o•́)ง'][f]
  return ['(=^･ω･^=)', '(=^-ω-^=)'][f]
}

async function summarise($) {
  try {
    const msgs = (await $.session.messages()).slice(-8).map((m) => m.role + ': ' + String(m.text || '').slice(0, 300)).join('\n')
    if (!msgs.trim()) return
    const r = await $.model.complete({ model: 'haiku', system: 'Summarise what this coding session is working on in under 12 words. No preamble.', prompt: msgs, maxTokens: 40, timeoutMs: 15000 })
    if (!r.isAnswered) return
    const all = (await $.store.get(PEERS)) || {}
    const id = await $.session.id()
    all[id] = { ...(all[id] || { t: await $.clock.now(), cwd: await $.session.cwd(), model: '' }), summary: r.text.trim().replace(/\s+/g, ' ').slice(0, 100) }
    await $.store.set(PEERS, all)
  } catch {}
}

export function register(on) {
  on('command.run', { command: 'live' }, async ($) => {
    await $.ui.open({ id: PANE, title: 'Live', closeOnEscape: true })
    return {}
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const bar = (p) => '█'.repeat(Math.round(Math.min(100, p) / 12.5)).padEnd(8, '░') + ' ' + Math.round(p) + '%'
    const rows = Object.entries(peerCache).map(([k, v]) =>
      Text({ children: [(k === me ? '★ ' : '  ') + k.slice(0, 6) + ' ' + String(v.cwd).split('/').slice(-2).join('/') + ' · ' + (v.summary || '…')], wrap: 'truncate' }))
    return Box({ flexDirection: 'column', children: [
      Text({ children: [pet() + '  5h ' + bar(usage.five) + '  ctx ' + bar(usage.ctx)], bold: true }),
      Text({ children: [' '] }),
      ...(rows.length ? rows : [Text({ children: ['No sessions yet.'] })]),
    ] })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    working = !!(e.props && e.props.isWorking)
    const { Box, Text } = $.ui.resolve(e)
    const theirs = await next(e)
    return Box({ flexDirection: 'column', children: [theirs, Text({ children: [pet()], dimColor: true })] })
  })

  on('session.start', async ($, e, next) => {
    $.clock.every(60_000, () => heartbeat($))
    me = await $.session.id()
    peerCache = await heartbeat($)
    $.clock.every(2000, async () => {
      tick++
      try {
        const u = await $.session.usage()
        usage.ctx = (u.context && u.context.percent) || 0
        const r = (u.rateLimits || []).find((x) => /five|5/.test(String(x.kind))) || (u.rateLimits || [])[0]
        usage.five = r ? r.percentUsed || 0 : 0
        peerCache = (await $.store.get(PEERS)) || {}
      } catch {}
      $.ui.invalidate('ui.render')
    })
    try { await $.command.register({ name: 'live', description: 'Open the live pane: peers, usage, pet' }) } catch {}
    try { await $.command.register({ name: 'peers', description: 'List your other live Claude sessions' }) } catch {}
    try { await $.command.register({ name: 'tell', description: 'Message another session: /tell <id-prefix> <text>', argumentHint: '<id-prefix> <text>' }) } catch {}
    return next(e)
  })

  on('command.run', { command: 'peers' }, async ($) => {
    const me = await $.session.id()
    const all = await heartbeat($)
    const rows = Object.entries(all).filter(([k]) => k !== me).map(([k, v]) => `${k.slice(0, 8)}  ${v.model}  ${v.cwd}  ${v.summary || ''}`)
    return { text: rows.length ? rows.join('\n') : 'No other live sessions.' }
  })

  on('command.run', { command: 'tell' }, async ($, e) => {
    const [prefix, ...rest] = (e.args || '').trim().split(/\s+/)
    const all = (await $.store.get(PEERS)) || {}
    const hits = Object.keys(all).filter((k) => prefix && k.startsWith(prefix))
    if (hits.length !== 1 || !rest.length) return { text: 'Usage: /tell <id-prefix> <text> (prefix must match exactly one peer; see /peers)' }
    const r = await $.session.send({ to: { sessionId: hits[0] }, text: rest.join(' ') })
    return { text: r.isDelivered ? 'Sent to ' + hits[0].slice(0, 8) : 'Not delivered: ' + r.reason }
  })

  on('session.receive', async ($, e, next) => {
    $.ui.toast('Message from another session: ' + String(e.text).slice(0, 120))
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const why = classify(e.command)
    if (!why) return next(e)
    let answer = 'Refuse'
    try { answer = await $.ui.ask(why + ' | run it? ' + e.command, ['Run it', 'Refuse']) } catch {}
    if (answer !== 'Run it') return { deny: 'The user declined this command. Ask before trying a different approach.' }
    return next(e)
  }).catch(async ($, e, next) => {
    if (next.called) return next(e)
    return { deny: 'Risky-command guard failed (' + next.error.kind + '), command not run.' }
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) $.clock.after(0, () => summarise($))
    if (!e.agentId && (e.durationMs || 0) > 30_000) { try { await $.audio.play('done') } catch {} }
    return next(e)
  })
}
