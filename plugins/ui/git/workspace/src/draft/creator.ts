import { repoOf, samePlace } from '@sand/git/contract'
import type { DraftTarget, ThreadCreator } from '@sand/web-client/contract'
import type { WorkspaceContext } from '../inject'
import type { DraftChoices } from './choices'
import type { DraftModel } from './model'

const inRepo = (ctx: WorkspaceContext, target: DraftTarget) => {
  const current = ctx.gitStatus.current.get()
  return Boolean(current && samePlace(current.place, target) && repoOf(current.status))
}

const chosenFor = (ctx: WorkspaceContext, model: DraftModel, choices: DraftChoices, target: DraftTarget) => {
  const picked = choices.get(target.id)
  if (picked) return picked
  return inRepo(ctx, target) ? model.choiceFor(target) : undefined
}

export const worktreeCreator =
  (ctx: WorkspaceContext, model: DraftModel, choices: DraftChoices): ThreadCreator =>
  target => {
    if (!target.cwd) return undefined
    const choice = chosenFor(ctx, model, choices, target)
    if (!choice || choice.kind === 'checkout') return undefined
    const input = choice.kind === 'existing' ? { cwd: target.cwd, existing: choice.path } : { cwd: target.cwd, from: choice.from }
    return ctx.worktrees.thread(input, target.device).then(info => {
      choices.forget(target.id)
      return info
    })
  }
