import type { BuildInfo, DeviceInfo, HostDevices, HostIdentity, HostStatus, PairBack, PairInvite } from '@sand/protocol'
import { hostPaths } from '@sand/kit'
import { adminDevice, type Caller } from '../auth/caller'
import type { Tickets } from '../auth/tickets'
import { createPairHandler } from './pair'
import { json, text, unauthorized } from './reply'

export interface Peer {
  address?: string
  upgrade(device: string): boolean
}

export type Reply = Response | Promise<Response> | undefined

export interface Route {
  method: 'GET' | 'POST'
  handle(request: Request, peer: Peer): Reply
}

export interface RoutesOptions {
  identity: DeviceInfo
  devices: Pick<HostDevices, 'get' | 'redeem' | 'remove'>
  caller: Caller
  tickets: Tickets
  version: string
  build(): Promise<BuildInfo | undefined>
  routeUrls(): string[]
  accept(back: PairBack, address?: string): Promise<boolean>
  invite(): PairInvite
  status(): HostStatus
  stop(): void
}

export const createRoutes = ({ identity, devices, caller, tickets, version, build, routeUrls, accept, invite, status, stop }: RoutesOptions) => {
  const self: HostIdentity = { deviceId: identity.id, name: identity.name, version }
  const pairHandler = createPairHandler({ identity, devices, routeUrls, accept })

  const authed =
    (handle: (device: string) => Response | Promise<Response>) =>
    (request: Request, peer: Peer) => {
      const device = caller(request, peer.address)
      return device ? handle(device) : unauthorized()
    }

  const unpair = async (device: string) => {
    if (device === adminDevice) return text('the admin key is not a paired device', 403)
    await devices.remove(device, { told: true })
    return new Response(null, { status: 204 })
  }

  const socket = (request: Request, peer: Peer) => {
    const ticket = new URL(request.url).searchParams.get('ticket')
    const device = ticket ? tickets.redeem(ticket) : undefined
    if (!device || (device !== adminDevice && !devices.get(device))) return unauthorized()
    return peer.upgrade(device) ? undefined : text('expected a websocket', 400)
  }

  return new Map<string, Route>([
    [hostPaths.identity, { method: 'GET', handle: async () => json({ ...self, build: await build().catch(() => undefined) }) }],
    [hostPaths.pair, { method: 'POST', handle: (request, peer) => pairHandler(request, peer.address) }],
    [hostPaths.invite, { method: 'POST', handle: authed(() => json(invite())) }],
    [hostPaths.ticket, { method: 'POST', handle: authed(device => json(tickets.issue(device))) }],
    [hostPaths.unpair, { method: 'POST', handle: authed(unpair) }],
    [hostPaths.health, { method: 'GET', handle: authed(() => json(status())) }],
    [
      hostPaths.stop,
      {
        method: 'POST',
        handle: authed(device =>
          device === adminDevice ? (stop(), new Response(null, { status: 202 })) : text('only the sand command can stop sand', 403),
        ),
      },
    ],
    [hostPaths.socket, { method: 'GET', handle: socket }],
  ])
}
