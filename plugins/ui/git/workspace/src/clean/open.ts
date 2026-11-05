import { place } from '@sand/layout/contract'
import { bytes, plural } from '@sand/util'
import type { Dispose } from 'drydock'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'
import { type Cleanup, createCleanup } from './model'
import { cleanupSheet } from './sheet'

const report = (ctx: WorkspaceContext, cleanup: Cleanup, problems: string[]) => {
  if (problems.length) return ctx.toasts.show({ id: toastId, tone: 'danger', title: `Couldn't remove ${plural(problems.length, 'worktree')}`, detail: problems.join('\n') })
  const freed = cleanup.freed.get()
  return ctx.toasts.show({ id: toastId, tone: 'success', title: `Removed ${plural(cleanup.picked.get().length, 'worktree')}`, ...(freed ? { detail: `Freed ${bytes(freed)}` } : {}) })
}

export const cleanupOpener = (ctx: WorkspaceContext) => {
  let unplace: Dispose | undefined

  const close = () => {
    void unplace?.()
    unplace = undefined
  }

  return () => {
    close()
    const cleanup = createCleanup(ctx, ctx.threads.device())
    const remove = async () => {
      const problems = await cleanup.removePicked()
      report(ctx, cleanup, problems)
      close()
    }
    unplace = place(ctx, 'overlay', () => cleanupSheet(ctx.kit, cleanup, close, () => void remove()), 100)
  }
}
