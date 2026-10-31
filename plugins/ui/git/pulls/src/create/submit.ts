import { gitPush } from '@sand/git-actions/contract'
import { pullsCreate, type PullSummary } from '@sand/github/contract'
import { uuid } from '@sand/util'
import type { PullPlace } from '../contract'
import type { PullsContext } from '../inject'
import { githubAction, notify, notifyError } from '../notify'
import { baseOf, needsPush, repoOf } from './facts'
import type { CreateModel } from './model'

const pushBranch = async (ctx: PullsContext, at: PullPlace, branch: string) => {
  const result = await ctx.wire.call(gitPush, { cwd: at.cwd, run: uuid() }, at.device)
  if (result.ok) return true
  const shown = notify(ctx, { tone: 'danger', sticky: true, title: `Couldn't push ${branch}`, detail: result.message, output: result.output })
  if (!shown) ctx.report(new Error(result.message))
  return false
}

export const submitPull = async (ctx: PullsContext, model: CreateModel, opened: (pull: PullSummary) => void) => {
  if (!model.canCreate()) return
  const { at, draft } = model
  const status = model.status.get()
  model.busy.set(true)
  try {
    if (needsPush(status) && !(await pushBranch(ctx, at, repoOf(status)?.branch ?? 'the branch'))) return
    const input = { cwd: at.cwd, title: draft.title.get().trim(), body: draft.body.get(), base: baseOf(status), draft: draft.draft.get(), session: at.session }
    const pull = await ctx.wire.call(pullsCreate, input, at.device)
    opened(pull)
    notify(ctx, { tone: 'success', title: `Opened PR #${pull.number}`, detail: pull.title, actions: [githubAction(ctx, pull.url)] })
  } catch (error) {
    notifyError(ctx, "Couldn't open the pull request", error)
  } finally {
    model.busy.set(false)
  }
}
