import type { Context } from 'drydock'
import type { Capture } from '../capture'

const quietFor = 30 * 60_000
const screens = new Set(['browser', 'phone'])

export const watchHost = (ctx: Context, capture: Capture) => {
  const lastSeen = new Map<string, number>()
  capture('app.started')
  ctx.on('hub.open', device => {
    const kind = ctx.hostDevices?.get(device)?.kind
    if (!kind || !screens.has(kind)) return
    const now = Date.now()
    const last = lastSeen.get(device)
    lastSeen.set(device, now)
    if (last === undefined || now - last >= quietFor) capture('client.connected', { client: kind })
  })
}
