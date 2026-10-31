import { type Pcs, pcsChange, wireHello } from '@sand/devices-contract'
import { listen } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { StatusClient } from './client'

export const renewOnReturn = (ctx: Context, client: StatusClient, pcs: Pcs) => {
  const online = new Map<string, boolean>()

  ctx.on(wireHello, () => client.renew(pcs.here().id))
  ctx.on(pcsChange, () => {
    const here = pcs.here().id
    for (const device of client.devices()) {
      if (device === here) continue
      const now = pcs.online(device)
      if (now && online.get(device) !== true) client.renew(device)
      online.set(device, now)
    }
  })
  ctx.effect(() =>
    listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') client.renew()
    }),
  )
}
