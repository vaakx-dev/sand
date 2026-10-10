import type { RemovedEntry } from '../../contract'
import type { RenderEntry } from '@sand/transcript-chat/contract'
import { derive, div, errorMessage, icon, secondaryAction, show, sig, span, type Pulse, type Sig } from '@sand/dom'
import type { WebContext, WorktreeClient } from '../client'

const samePlace = (a: string, b: string) => a.replace(/[\\/]+$/, '').toLowerCase() === b.replace(/[\\/]+$/, '').toLowerCase()

const restore = async (ctx: WebContext, client: WorktreeClient, thread: string, entry: string, busy: Sig<boolean>) => {
  busy.set(true)
  try {
    await client.restore(thread, entry)
    if (ctx.threads.get(thread)?.info.settled) await ctx.threads.settle(thread, false)
  } catch (error) {
    ctx.notify?.push(`Could not restore the worktree: ${errorMessage(error)}`, { level: 'error' })
  } finally {
    busy.set(false)
  }
}

const merged = (pr: number) =>
  div({ class: 'flex min-h-6 items-center gap-2 text-neutral-300' }, span({ class: 'inline-flex shrink-0 text-success-400' }, icon('check', 14)), `PR #${pr} merged`)

export const removedNote =
  (ctx: WebContext, client: WorktreeClient, changes: Pulse): RenderEntry =>
  (entry, thread) => {
    const removed = entry.data as RemovedEntry
    const busy = sig(false)
    const back = changes.read(() => samePlace(ctx.threads.get(thread)?.info.cwd ?? '', removed.cwd))
    const text = removed.pr ? 'Worktree removed, thread settled. Restore brings both back.' : 'Worktree removed. Restore brings it back.'
    return div(
      { class: 'my-4 flex flex-col gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm' },
      removed.pr ? merged(removed.pr) : null,
      div(
        { class: 'flex min-h-6 items-center gap-3 text-neutral-500' },
        span({ class: 'min-w-0 flex-1', title: removed.path }, () => (back.get() ? `Worktree on ${removed.branch} restored.` : text)),
        show(derive(() => !back.get()), () =>
          secondaryAction({ size: 'sm', disabled: () => busy.get(), onClick: () => void restore(ctx, client, thread, entry.id, busy) }, () =>
            busy.get() ? 'Restoring…' : 'Restore',
          ),
        ),
      ),
    )
  }
