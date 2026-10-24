import { git } from '@sand/util/git'
import type { FileChange } from '../contract'

const kind = (code: string): FileChange => {
  if (code.includes('D')) return 'deleted'
  if (code === '??' || /[ARC]/.test(code)) return 'added'
  return 'modified'
}

export const fileChanges = async (cwd: string) => {
  const [prefix, status] = await Promise.all([
    git(cwd, ['rev-parse', '--show-prefix']),
    git(cwd, ['status', '--porcelain', '-z', '--untracked-files=all', '--', '.']),
  ])
  const changes: Record<string, FileChange> = {}
  if (prefix.code !== 0 || status.code !== 0) return changes
  const base = prefix.out.trim()
  const entries = status.out.split('\0')
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]
    if (!entry) continue
    const code = entry.slice(0, 2)
    if (/^[RC]/.test(code)) index++
    const path = entry.slice(3)
    if (path.startsWith(base)) changes[path.slice(base.length)] = kind(code)
  }
  return changes
}
