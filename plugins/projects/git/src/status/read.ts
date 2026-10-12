import type { GitStatus } from '../contract'
import { existsSync } from 'node:fs'
import { gitMaybe } from '@sand/kit/git'
import { isLinkedWorktree, parsePorcelain } from './parse'

const remoteHead = async (cwd: string) => (await gitMaybe(cwd, ['rev-parse', '--abbrev-ref', 'origin/HEAD'])) || undefined

const commitsIn = async (cwd: string, range: string) => Number(await gitMaybe(cwd, ['rev-list', '--count', range])) || 0

export const readStatus = async (cwd: string): Promise<GitStatus | null> => {
  if (!cwd || !existsSync(cwd)) return null
  const [porcelain, dirs, originHead] = await Promise.all([
    gitMaybe(cwd, ['--no-optional-locks', 'status', '--porcelain=v2', '--branch']),
    gitMaybe(cwd, ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir']),
    remoteHead(cwd),
  ])
  if (porcelain === undefined) return null
  const status = parsePorcelain(porcelain)
  const base = originHead?.replace(/^origin\//, '')
  const onFeature = Boolean(originHead) && status.branch !== base && status.branch !== 'HEAD'
  const [ahead, behindBase] = await Promise.all([
    onFeature && !status.upstream ? commitsIn(cwd, `${originHead}..HEAD`) : status.ahead,
    onFeature ? commitsIn(cwd, `HEAD..${originHead}`) : 0,
  ])
  return { ...status, ahead, behindBase, worktree: isLinkedWorktree(dirs), ...(base && { base }) }
}
