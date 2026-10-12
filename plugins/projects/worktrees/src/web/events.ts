import type { WireEvent, WireEvents } from '@sand/protocol'
import type { Context } from 'drydock'

export const onWorktreeEvent = <K extends 'worktrees.progress' | 'worktrees.change' | 'git.change'>(ctx: Context, name: K, handle: (args: WireEvents[K]) => void) => {
  const take = (event: WireEvent) => {
    if (event.name === name) handle(event.args as WireEvents[K])
  }
  ctx.on('wire.event', take)
  ctx.on('machines.event', (_device, event) => take(event))
}
