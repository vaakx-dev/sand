import { pcsChange, wireHello } from '@sand/devices-contract'
import type { PullsContext } from './inject'

const onlineIds = (ctx: PullsContext) => new Set(ctx.pcs.list().flatMap(pc => (pc.online ? [pc.id] : [])))

export const onReconnect = (ctx: PullsContext, reload: (device?: string) => void) => {
  let online = onlineIds(ctx)
  ctx.on(wireHello, () => reload())
  ctx.on(pcsChange, () => {
    const next = onlineIds(ctx)
    for (const device of next) if (!online.has(device)) reload(device)
    online = next
  })
}
