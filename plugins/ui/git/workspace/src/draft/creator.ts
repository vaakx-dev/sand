import type { DraftTarget, ThreadCreator } from '@sand/web-client/contract'
import { worktreesThread } from '@sand/worktrees/contract'
import type { WorkspaceContext } from '../inject'
import { repoOf } from '../paths'
import type { DraftChoices } from './choices'
import type { DraftModel } from './model'

const chosenFor = (ctx: WorkspaceContext, model: DraftModel, choices: DraftChoices, target: DraftTarget) => {
  const picked = choices.get(target.id)
  if (picked) return picked
  return repoOf(ctx.gitStatus.current(target)) ? model.choiceFor(target) : undefined
}

export const worktreeCreator =
  (ctx: WorkspaceContext, model: DraftModel, choices: DraftChoices): ThreadCreator =>
  target => {
    if (!target.cwd) return undefined
    const choice = chosenFor(ctx, model, choices, target)
    if (!choice || choice.kind === 'checkout') return undefined
    const input = choice.kind === 'existing' ? { cwd: target.cwd, existing: choice.path } : { cwd: target.cwd, from: choice.from }
    return ctx.wire.call(worktreesThread, input, target.device).then(info => {
      choices.forget(target.id)
      return info
    })
  }
