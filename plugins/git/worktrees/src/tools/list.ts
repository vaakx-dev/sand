import type { Tool } from '@sand/tools/contract'
import { bytes, plural } from '@sand/util'
import { isWithin } from '@sand/util/fs'
import { z } from 'zod'
import type { RemoveCheck, WorktreeStatus } from '../contract'
import type { Survey } from '../status/survey'

const input = z.object({})

const sizeWaitMs = 5000

const unsaved = ({ uncommitted, unpushed }: RemoveCheck) => {
  const parts = [uncommitted ? plural(uncommitted, 'uncommitted file') : '', unpushed ? plural(unpushed, 'unpushed commit') : ''].filter(Boolean)
  return parts.length ? `unsaved work: ${parts.join(', ')}` : 'nothing unsaved'
}

const facts = (status: WorktreeStatus, size: number | undefined, cwd: string) =>
  [
    status.branch ? `branch ${status.branch}` : 'no branch',
    size === undefined ? 'size still counting' : bytes(size),
    status.pull ? `PR #${status.pull.number} ${status.pull.state}` : 'no linked PR',
    status.ahead === undefined ? '' : `${plural(status.ahead, 'commit')} beyond ${status.base}`,
    unsaved(status.check),
    status.check.running ? 'a thread is working in it' : '',
    isWithin(cwd, status.path) ? 'you are in it' : '',
  ].filter(Boolean)

export const listTool = (survey: Survey): Tool<typeof input> => ({
  name: 'worktree_list',
  description: [
    'List every worktree sand made on this PC, biggest first, with its size on disk, branch, linked PR state and whether it has unsaved work.',
    'Use this instead of git worktree list.',
  ].join(' '),
  input,
  async run(_input, { cwd }) {
    const [statuses] = await Promise.all([survey.status(), Promise.race([survey.sizes(), Bun.sleep(sizeWaitMs)])])
    if (!statuses.length) return 'Sand has no worktrees on this PC.'
    const sized = statuses.map(status => ({ status, size: survey.known(status.path) }))
    sized.sort((a, b) => (b.size ?? -1) - (a.size ?? -1))
    return sized.map(({ status, size }) => `${status.path}\n  ${facts(status, size, cwd).join(' · ')}`).join('\n')
  },
})
