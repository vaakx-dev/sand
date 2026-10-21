import type { BuildChange } from '@sand/host-dist/contract'
import { gitMaybe } from '@sand/util/git'

const depth = 100
const separator = '\x1f'
const conventional = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/

const parseChange = (line: string): BuildChange | undefined => {
  const [commit, subject] = line.split(separator)
  if (!commit || !subject) return
  const match = conventional.exec(subject.trim())
  if (!match) return { commit, type: 'other', summary: subject.trim() }
  const [, type = '', scope, summary = ''] = match
  return { commit, type: type.toLowerCase(), ...(scope && { scope }), summary: summary.trim() }
}

export const buildHistory = async (root: string) => {
  const log = await gitMaybe(root, ['log', `-n${depth}`, `--format=%H${separator}%s`]).catch(() => undefined)
  if (!log) {
    console.error('git history is not available, so this build lists no changes')
    return undefined
  }
  const changes = log.split('\n').flatMap(line => parseChange(line) ?? [])
  return { commit: changes[0]?.commit, changes }
}
