const READ_CMDS = new Set(['ls', 'cat', 'head', 'tail', 'wc', 'pwd', 'echo', 'grep', 'rg', 'which', 'file', 'stat', 'du', 'df', 'tree', 'diff', 'sort', 'uniq', 'cut', 'date', 'whoami', 'env', 'printenv', 'basename', 'dirname', 'realpath'])
const GIT_READ = new Set(['status', 'log', 'diff', 'show', 'branch', 'remote', 'blame', 'ls-files', 'rev-parse', 'describe', 'shortlog', 'tag', 'config', 'stash'])
const GIT_MUTATING_FLAGS = /(^|\s)(-d|-D|-m|-M|--delete|--set|--unset|--add|drop|pop|apply|clear)(\s|$)/

/** True only when every segment of the command is a known read-only command with no redirect. */
export function isReadOnlyCommand(command: string): boolean {
  if (/[>`]|\$\(|<\(/.test(command)) return false
  const segments = command.split(/&&|\|\||;|\|/).map(s => s.trim()).filter(Boolean)
  if (segments.length === 0) return false
  return segments.every(seg => {
    const words = seg.split(/\s+/)
    const cmd = words[0]
    if (cmd === 'git') {
      const sub = words.slice(1).find(w => !w.startsWith('-'))
      if (!sub || !GIT_READ.has(sub)) return false
      if (['branch', 'tag', 'config', 'stash', 'remote'].includes(sub)) {
        const rest = words.slice(words.indexOf(sub) + 1).join(' ')
        // listing is fine; creating, deleting or setting is not
        if (sub === 'stash') return /^(list|show)\b/.test(rest)
        if (sub === 'config') return /^(--get|--list|-l)\b/.test(rest)
        if (sub === 'remote') return rest === '' || /^(-v|show)\b/.test(rest)
        return rest === '' || !(GIT_MUTATING_FLAGS.test(rest) || /^[^-]/.test(rest)) || /^(-a|-r|-v|--list|--show-current)\b/.test(rest)
      }
      return true
    }
    if (cmd === 'find') return !/(^|\s)(-delete|-exec|-execdir|-ok)\b/.test(seg)
    if (cmd === 'sed') return !/\s-i/.test(seg)
    return READ_CMDS.has(cmd)
  })
}

export const EDIT_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
