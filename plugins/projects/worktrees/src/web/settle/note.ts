import type { RemovedEntry } from '../../contract'
import type { RenderEntry } from '@sand/transcript-parts/contract'
import { errorMessage } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import { div, show, sig, span, type Sig } from '@vaakx-dev/vrui'
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

export const removedNote =
  (ctx: WebContext, client: WorktreeClient, changes: Pulse): RenderEntry =>
  (entry, thread) => {
    const { okMark, secondaryAction } = ctx.kit
    const removed = entry.data as RemovedEntry
    const busy = sig(false)
    const back = changes.read(() => samePlace(ctx.threads.get(thread)?.info.cwd ?? '', removed.cwd))
    const text = removed.pr ? 'Worktree removed, thread settled. Restore brings both back.' : 'Worktree removed. Restore brings it back.'
    return div(
      { class: 'my-4 flex flex-col gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm' },
      removed.pr ? div({ class: 'flex min-h-6 items-center gap-2 text-neutral-300' }, okMark(), `PR #${removed.pr} merged`) : null,
      div(
        { class: 'flex min-h-6 items-center gap-3 text-neutral-500' },
        span({ class: 'min-w-0 flex-1', title: removed.path }, () => (back.get() ? `Worktree on ${removed.branch} restored.` : text)),
        show(
          () => !back.get(),
          () =>
            secondaryAction({ size: 'sm', disabled: () => busy.get(), onClick: () => void restore(ctx, client, thread, entry.id, busy) }, () =>
              busy.get() ? 'Restoring…' : 'Restore',
            ),
        ),
      ),
    )
  }
