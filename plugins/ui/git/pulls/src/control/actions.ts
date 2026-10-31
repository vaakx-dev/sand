import { type GitActionContext, gitBaseRank, type GitPrimaryAction } from '@sand/git-control/contract'
import type { PullPlace, ThreadPullsClient } from '../contract'
import { blockReason } from '../create/facts'

const rank = gitBaseRank + 10

const pullPlace = ({ place, thread }: GitActionContext): PullPlace | undefined =>
  thread && thread.info.kind !== 'quick' ? { session: thread.id, cwd: place.cwd, device: place.device } : undefined

const withoutPull = (client: ThreadPullsClient, context: GitActionContext) => {
  const at = pullPlace(context)
  return at && client.canCreate(at) && !client.primary(at.session) ? at : undefined
}

const pushedAhead = ({ base, status }: GitActionContext) =>
  !base && !blockReason(status) && Boolean(status.remote?.upstream) && (status.remote?.aheadBase ?? 0) > 0

export const shipAction = (client: ThreadPullsClient): GitPrimaryAction => ({
  id: 'git-pulls.ship',
  decide: context =>
    context.base?.id === 'commit-push' && withoutPull(client, context)
      ? { label: 'Commit, push & PR', short: 'Ship', icon: 'pull-request', title: 'Commit and push, then open a pull request', rank }
      : undefined,
  run: async context => {
    const at = pullPlace(context)
    if (at && (await context.commit({ push: true }))) client.create(at)
  },
})

export const createAction = (client: ThreadPullsClient): GitPrimaryAction => ({
  id: 'git-pulls.create',
  decide: context =>
    pushedAhead(context) && withoutPull(client, context)
      ? { label: 'Create PR', short: 'PR', icon: 'pull-request', title: 'Open a pull request for this branch', rank }
      : undefined,
  run: context => {
    const at = pullPlace(context)
    if (at) client.create(at)
  },
})
