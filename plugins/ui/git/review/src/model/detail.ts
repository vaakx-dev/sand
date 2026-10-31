import { isLivePull } from '@sand/github/look'
import { type PullRef, samePull } from '@sand/github/contract'
import type { PullCommit } from '@sand/pull-detail/contract'
import { effect, sig } from '@vaakx-dev/vrui'
import { type ReviewContext, toastId } from '../inject'

export const detailModel = (ctx: ReviewContext, ref: PullRef) => {
  const commits = sig<PullCommit[]>([])
  const live = sig(false)
  let ticket = 0

  const load = () => {
    const mine = ++ticket
    ctx.pullDetail
      .detail(ref)
      .then(found => {
        if (mine !== ticket) return
        commits.set(found.commits)
        live.set(isLivePull(found.state))
      })
      .catch(error => {
        if (mine === ticket) ctx.toasts.error(toastId, "Couldn't load the pull request's commits", error)
      })
  }

  effect(() =>
    ctx.pullDetail.onChange(changed => {
      if (samePull(changed, ref)) load()
    }),
  )
  load()

  return { commits, live }
}
