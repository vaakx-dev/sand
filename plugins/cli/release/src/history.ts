import type { BuildChange } from '@sand/util/release'

const DEPTH = 100
const SEPARATOR = '\x1f'
const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/

const parseChange = (line: string): BuildChange | undefined => {
  const [commit, subject] = line.split(SEPARATOR)
  if (!commit || !subject) return
  const match = CONVENTIONAL.exec(subject.trim())
  if (!match) return { commit, type: 'other', summary: subject.trim() }
  const [, type = '', scope, summary = ''] = match
  return { commit, type: type.toLowerCase(), ...(scope && { scope }), summary: summary.trim() }
}

const gitLog = async (root: string) => {
  const result = await Bun.$`git -C ${root} log -n${DEPTH} --format=%H${SEPARATOR}%s`.quiet().nothrow()
  return result.exitCode === 0 ? result.text() : undefined
}

const buildHistory = async (root: string) => {
  const log = await gitLog(root).catch(() => undefined)
  if (!log) {
    console.error('git history is not available, so this build lists no changes')
    return undefined
  }
  const changes = log.split('\n').flatMap(line => parseChange(line) ?? [])
  return { commit: changes[0]?.commit, changes }
}

export { buildHistory }
