import { pcHello } from '@sand/devices-contract'
import { listen } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { StatusClient } from './client'

export const renewOnReturn = (ctx: Context, client: StatusClient) => {
  ctx.on(pcHello, pc => client.renew(pc))
  ctx.effect(() =>
    listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') client.renew()
    }),
  )
}
