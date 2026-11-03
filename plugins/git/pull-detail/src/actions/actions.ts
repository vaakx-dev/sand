import { type PullRef, pullKey } from '@sand/github/contract'
import { keyedSerial } from '@sand/util'
import { type Action, type ActionDeps, perform } from './action'
import { deleteBranch } from './branch'
import { reviewCandidates } from './candidates'
import { close } from './close'
import { edit } from './edit'
import { reply } from './reply'
import { resolve } from './resolve'
import { revertPullRequest } from './revert'
import { requestReview } from './reviewers'
import { updatePullBranch } from './update'

export type PullActions = ReturnType<typeof createActions>

export const createActions = (deps: ActionDeps) => {
  const queue = keyedSerial()
  const act =
    <I>(action: Action<I>) =>
    (ref: PullRef, input: I) =>
      queue(pullKey(ref), () => perform(deps, action, ref, input))

  return {
    reply: act(reply),
    resolve: act(resolve),
    edit: act(edit),
    requestReview: act(requestReview),
    close: act(close),
    deleteBranch: act(deleteBranch),
    update: (ref: PullRef) => queue(pullKey(ref), () => updatePullBranch(deps, ref)),
    revert: (ref: PullRef) => queue(pullKey(ref), () => revertPullRequest(deps, ref)),
    candidates: (ref: PullRef, q?: string) => reviewCandidates(deps, ref, q),
  }
}
