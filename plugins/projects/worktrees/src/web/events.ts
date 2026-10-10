import type { WireEvent, WireEvents } from '@sand/protocol'
import type { Context } from 'drydock'

type Name = 'worktrees.progress' | 'worktrees.change'

export const onWorktreeEvent = <K extends Name>(ctx: Context, name: K, handle: (args: WireEvents[K], device?: string) => void) => {
  const take = (event: WireEvent, device?: string) => {
    if (event.name === name) handle(event.args as WireEvents[K], device || undefined)
  }
  ctx.on('wire.event', event => take(event))
  ctx.on('machines.event', (device, event) => take(event, device))
}
