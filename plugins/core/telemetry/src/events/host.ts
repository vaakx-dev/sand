import type { HostDevices } from '@sand/host-devices/contract'
import type { Context } from 'drydock'
import type { Capture } from '../capture'

const adminDevice = 'admin'

const clientKind = (devices: HostDevices | undefined, device: string) =>
  device === adminDevice ? 'this-pc' : (devices?.get(device)?.kind ?? 'unknown')

export const watchHost = (ctx: Context, capture: Capture) => {
  capture('app.started')
  ctx.on('hub.open', device => capture('client.connected', { client: clientKind(ctx.hostDevices, device) }))
}
