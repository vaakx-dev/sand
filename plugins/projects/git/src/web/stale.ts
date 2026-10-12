import { onPageReturn } from '@sand/kit/web'
import type { WireEvent } from '@sand/protocol'
import type { Context } from 'drydock'

export const forgetWhenStale = (ctx: Context, forget: () => void) => {
  const changed = (event: WireEvent) => {
    if (event.name === 'git.change') forget()
  }
  ctx.on('wire.event', changed)
  ctx.on('machines.event', (_device, event) => changed(event))
  ctx.on('wire.hello', forget)
  ctx.effect(() => onPageReturn(forget))
}
