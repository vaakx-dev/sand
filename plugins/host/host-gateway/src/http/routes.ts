import type { HostDevices, PairBack, PairInvite } from '@sand/host-devices/contract'
import { hostPaths } from '@sand/kit'
import { textReply } from '@sand/kit/host'
import type { BuildInfo, DeviceInfo, HostStatus } from '@sand/protocol'
import { adminDevice, type Caller } from '../auth/caller'
import type { Tickets } from '../auth/tickets'
import type { HostIdentity } from '../contract'
import { createPairHandler } from './pair'
import { json, unauthorized } from './reply'

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
  build(): Promise<BuildInfo | undefined>
  routeUrls(): string[]
  accept(back: PairBack, address?: string): Promise<boolean>
  invite(): PairInvite
  status(): HostStatus
  stop(): void
}

export const createRoutes = ({ identity, devices, caller, tickets, build, routeUrls, accept, invite, status, stop }: RoutesOptions) => {
  const self: HostIdentity = { deviceId: identity.id, name: identity.name }
  const pairHandler = createPairHandler({ identity, devices, routeUrls, accept })

  const authed =
    (handle: (device: string) => Response | Promise<Response>) =>
    (request: Request, peer: Peer) => {
      const device = caller(request, peer.address)
      return device ? handle(device) : unauthorized()
    }

  const unpair = async (device: string) => {
    if (device === adminDevice) return textReply('the admin key is not a paired device', 403)
    await devices.remove(device, { told: true })
    return new Response(null, { status: 204 })
  }

  const stopHost = (device: string) => {
    if (device !== adminDevice) return textReply('only the sand command can stop sand', 403)
    stop()
    return new Response(null, { status: 202 })
  }

  const socket = (request: Request, peer: Peer) => {
    const ticket = new URL(request.url).searchParams.get('ticket')
    const device = ticket ? tickets.redeem(ticket) : undefined
    if (!device || (device !== adminDevice && !devices.get(device))) return unauthorized()
    return peer.upgrade(device) ? undefined : textReply('expected a websocket', 400)
  }

  return new Map<string, Route>([
    [hostPaths.identity, { method: 'GET', handle: async () => json({ ...self, build: await build().catch(() => undefined) }) }],
    [hostPaths.pair, { method: 'POST', handle: (request, peer) => pairHandler(request, peer.address) }],
    [hostPaths.invite, { method: 'POST', handle: authed(() => json(invite())) }],
    [hostPaths.ticket, { method: 'POST', handle: authed(device => json(tickets.issue(device))) }],
    [hostPaths.unpair, { method: 'POST', handle: authed(unpair) }],
    [hostPaths.health, { method: 'GET', handle: authed(() => json(status())) }],
    [hostPaths.stop, { method: 'POST', handle: authed(stopHost) }],
    [hostPaths.socket, { method: 'GET', handle: socket }],
  ])
}
