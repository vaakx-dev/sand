import type { WorktreeProgress } from '../../contract'
import { onTimeout, sig } from '@sand/dom'
import type { Context } from 'drydock'
import { onWorktreeEvent } from '../events'

const lingerMs = 4000

export const createProgress = (ctx: Context) => {
  const all = sig<Record<string, WorktreeProgress>>({})
  const timers = new Map<string, () => void>()

  const stopTimer = (session: string) => {
    timers.get(session)?.()
    timers.delete(session)
  }

  const dismiss = (session: string) => {
    stopTimer(session)
    all.update(({ [session]: _gone, ...rest }) => rest)
  }

  onWorktreeEvent(ctx, 'worktrees.progress', ([progress]) => {
    stopTimer(progress.session)
    all.update(current => ({ ...current, [progress.session]: progress }))
    if (progress.done && !progress.error) timers.set(progress.session, onTimeout(() => dismiss(progress.session), lingerMs))
  })
  ctx.effect(() => () => timers.forEach(stop => stop()))

  return { of: (session: string | undefined) => (session ? all.get()[session] : undefined), dismiss }
}

export type Progress = ReturnType<typeof createProgress>
