import type { Worktrees } from '@sand/worktrees/contract'
import { pulse, sig } from '@sand/dom'
import type { ActionContext } from './actions/send'
import { nextStep, type Pr } from './state/next'

export const createModel = (ctx: ActionContext) => {
  const changes = pulse(ctx, ['gitStatus.change', 'pulls.change', 'thread.select', 'threads.change', 'wire.state'], ['gitStatus', 'pulls'])
  const target = () => ({ cwd: ctx.threads.current()?.info.cwd ?? ctx.threads.cwd(), device: ctx.threads.device() })
  const status = changes.read(() => {
    const { cwd, device } = target()
    return ctx.gitStatus.of(cwd, device)
  })
  const pr = changes.read((): Pr => {
    const git = status.get()
    if (!git || git.branch === 'HEAD' || git.branch === git.base) return git ? null : undefined
    const { cwd, device } = target()
    return ctx.pulls?.of(cwd, device)
  })
  const step = changes.read(() => nextStep(status.get(), pr.get()))
  const worktrees = sig<Worktrees | undefined>(undefined)
  ctx.watch('worktrees', role => {
    worktrees.set(role)
    return () => worktrees.set(undefined)
  })

  const refreshPr = () => {
    const { cwd, device } = target()
    ctx.pulls?.refresh(cwd, device)
  }

  const refresh = () => {
    const { cwd, device } = target()
    ctx.gitStatus.refresh(cwd, device)
    refreshPr()
  }

  return { status, pr, step, worktrees, target, refresh, refreshPr }
}

export type Model = ReturnType<typeof createModel>
