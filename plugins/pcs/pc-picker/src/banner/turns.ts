import type { Sig } from '@sand/dom'
import { refreshGroup } from '../refresh'
import { currentTarget, type PickerContext } from '../target'

export const watchTurnEnds = (ctx: PickerContext, armed: Sig<string | undefined>) => {
  const running = new Map<string, boolean>()
  ctx.on('thread.change', id => {
    const thread = ctx.threads.get(id)
    if (!thread) return
    const wasRunning = running.get(id) ?? false
    running.set(id, thread.running)
    if (!wasRunning || thread.running || id !== ctx.threads.current()?.id) return
    const { group } = currentTarget(ctx)
    if (!group || group.locations.length < 2) return
    armed.set(id)
    refreshGroup(ctx, group)
  })
  ctx.on('thread.select', () => armed.set(undefined))
}
