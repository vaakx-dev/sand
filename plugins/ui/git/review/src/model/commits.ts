import type { PullRef } from '@sand/github/contract'
import type { PullCommit } from '@sand/pull-detail/contract'
import { effect, sig } from '@vaakx-dev/vrui'
import type { ReviewContext } from '../inject'
import { notifyError } from '../notify'
import { sameRef } from '../pull/ref'

export const commitsModel = (ctx: ReviewContext, ref: PullRef) => {
  const commits = sig<PullCommit[]>([])
  let ticket = 0

  const load = () => {
    const mine = ++ticket
    ctx.pullDetail
      .detail(ref)
      .then(found => {
        if (mine === ticket) commits.set(found.commits)
      })
      .catch(error => {
        if (mine === ticket) notifyError(ctx, "Couldn't load the pull request's commits", error)
      })
  }

  effect(() =>
    ctx.pullDetail.onChange(changed => {
      if (sameRef(changed, ref)) load()
    }),
  )
  load()

  return commits
}
