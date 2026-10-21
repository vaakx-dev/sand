import type { DeviceInfo, HostDevices, PairLinkRequest, PairLinkResult } from '@sand/host-devices/contract'
import type { HttpRoute } from '@sand/host-gateway/contract'
import { readJson, textReply } from '@sand/util/host'
import { parsePeerLink, type RemoteStore } from '../peers'
import type { Status } from './status'

const limit = 8192

interface LinkRouteOptions {
  self: DeviceInfo
  store: RemoteStore
  devices: Pick<HostDevices, 'get' | 'link'>
  status: Status
  accept(request: Required<PairLinkRequest>, address?: string): Promise<boolean>
  learn(request: PairLinkRequest, address?: string): Promise<void>
}

export const linkRoute = ({ self, store, devices, status, accept, learn }: LinkRouteOptions): HttpRoute => ({
  method: 'POST',
  async handle({ request, device, admin, address }) {
    if (!device || admin) return textReply('this PC does not know that key', 401)
    if (devices.get(device)?.kind !== 'pc') return textReply('only paired PCs can link', 403)
    const body = parsePeerLink(await readJson(request, limit))
    if (!body) return textReply('expected {device, urls, key?} as JSON', 400)
    await devices.link(device, body.device)
    if (body.key) await accept({ ...body, key: body.key }, address)
    else await learn(body, address)
    const accepts = !!store.get(body.device.id) && !status.refused(body.device.id)
    const result: PairLinkResult = { device: self, accepts }
    return Response.json(result, { headers: { 'cache-control': 'no-store' } })
  },
})
