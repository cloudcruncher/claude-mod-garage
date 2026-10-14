export type Tier = 'haiku' | 'sonnet' | 'opus'

const OPUS = /\b(review|audit|security|vulnerab\w*|architect\w*|design|trade-?offs?|threat|plan(ning)?)\b/i
const SONNET = /\b(implement\w*|fix\w*|bug|test(s|ing)?|refactor\w*|build|write|add|migrat\w*|debug\w*|update|create)\b/i
const HAIKU = /\b(search|find|look ?up|locate|list|grep|summari[sz]e|summary|explore|triage|read|check|where)\b/i

/** Pick a tier from the delegated prompt; opus beats sonnet beats haiku. Undefined when nothing matches. */
export function pickTier(text: string): Tier | undefined {
  if (OPUS.test(text)) return 'opus'
  if (SONNET.test(text)) return 'sonnet'
  if (HAIKU.test(text)) return 'haiku'
  return undefined
}

/** Crossed thresholds (ascending) between the previous and current percent, not already fired. */
export function crossed(percent: number, thresholds: readonly number[], fired: ReadonlySet<number>): number[] {
  return thresholds.filter(t => percent >= t && !fired.has(t))
}

export function statusLine(fiveHour: number | undefined, context: number | undefined): string {
  const f = fiveHour === undefined ? '5h n/a' : `5h ${Math.round(fiveHour)}%`
  const c = context === undefined ? 'ctx n/a' : `ctx ${Math.round(context)}%`
  return `${f} | ${c}`
}
