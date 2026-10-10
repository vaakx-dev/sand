import type { GitStatus } from '../contract'
import { existsSync } from 'node:fs'
import { git } from '../run'
import { isLinkedWorktree, parsePorcelain } from './parse'

const remoteHead = async (cwd: string) => (await git(['rev-parse', '--abbrev-ref', 'origin/HEAD'], cwd))?.trim() || undefined

const unpushed = async (cwd: string, base: string) => Number((await git(['rev-list', '--count', `${base}..HEAD`], cwd))?.trim() ?? 0) || 0

export const readStatus = async (cwd: string): Promise<GitStatus | null> => {
  if (!cwd || !existsSync(cwd)) return null
  const [porcelain, dirs, head] = await Promise.all([
    git(['status', '--porcelain=v2', '--branch'], cwd),
    git(['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir'], cwd),
    remoteHead(cwd),
  ])
  if (porcelain === undefined) return null
  const status = parsePorcelain(porcelain)
  const base = head?.replace(/^origin\//, '')
  const ahead = !status.upstream && head && status.branch !== base && status.branch !== 'HEAD' ? await unpushed(cwd, head) : status.ahead
  return { ...status, ahead, worktree: isLinkedWorktree(dirs), ...(base && { base }) }
}
