import { gitActionsClient, type GitActionFailure } from '@sand/git-actions/contract'
import type { PullSummary } from '@sand/github/contract'
import { uuid } from '@sand/util'
import type { PullPlace } from '../contract'
import { type PullsContext, toastId } from '../inject'
import { githubAction } from '../pull/github-action'
import { baseOf, needsPush, repoOf } from './facts'
import type { CreateModel } from './model'

const pushOff: GitActionFailure = { ok: false, reason: 'unknown', message: 'Git actions are turned off, so sand cannot push. Push the branch yourself, then try again.' }

const pushBranch = async (ctx: PullsContext, at: PullPlace, branch: string) => {
  const actions = ctx.get(gitActionsClient)
  const result = actions ? await actions.push({ cwd: at.cwd, run: uuid() }, at.device) : pushOff
  if (result.ok) return true
  ctx.toasts.show({ id: toastId, tone: 'danger', sticky: true, title: `Couldn't push ${branch}`, detail: result.message, output: result.output })
  return false
}

const create = async (ctx: PullsContext, model: CreateModel) => {
  const { at, draft } = model
  const status = model.status.get()
  if (needsPush(status) && !(await pushBranch(ctx, at, repoOf(status)?.branch ?? 'the branch'))) return undefined
  const input = { cwd: at.cwd, title: draft.title.get().trim(), body: draft.body.get(), base: baseOf(status), draft: draft.draft.get(), session: at.session }
  return ctx.github.create(input, at.device)
}

export const submitPull = async (ctx: PullsContext, model: CreateModel, opened: (pull: PullSummary) => void) => {
  if (!model.canCreate()) return
  model.busy.set(true)
  const pull = await ctx.toasts.attempt(toastId, "Couldn't open the pull request", () => create(ctx, model))
  model.busy.set(false)
  if (!pull) return
  opened(pull)
  ctx.toasts.show({ id: toastId, tone: 'success', title: `Opened PR #${pull.number}`, detail: pull.title, actions: [githubAction(ctx.kit, pull.url)] })
}
