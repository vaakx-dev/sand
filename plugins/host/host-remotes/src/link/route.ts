import type { HostDevices, PairLinkRequest, PairLinkResult } from '@sand/host-devices/contract'
import type { HttpRoute } from '@sand/host-gateway/contract'
import type { RemoteStore } from '@sand/kit/host'
import type { DeviceInfo } from '@sand/protocol'
import type { Status } from './status'

const limit = 8192

const word = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const parse = (value: unknown): PairLinkRequest | undefined => {
  if (!value || typeof value !== 'object') return
  const { device, urls, key } = value as Record<string, unknown>
  if (!device || typeof device !== 'object' || !Array.isArray(urls)) return
  const { id, name, platform } = device as Record<string, unknown>
  if (!word(id) || !word(name)) return
  return {
    device: { id, name, platform: typeof platform === 'string' ? platform : '' },
    urls: urls.filter(word).slice(0, 16),
    ...(word(key) && { key }),
  }
}

const text = (body: string, status: number) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })

export interface LinkRouteOptions {
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
    if (!device || admin) return text('this PC does not know that key', 401)
    if (devices.get(device)?.kind !== 'pc') return text('only paired PCs can link', 403)
    const body = Number(request.headers.get('content-length') ?? 0) > limit ? undefined : parse(await request.json().catch(() => undefined))
    if (!body) return text('expected {device, urls, key?} as JSON', 400)
    await devices.link(device, body.device)
    if (body.key) await accept({ ...body, key: body.key }, address)
    else await learn(body, address)
    const accepts = !!store.get(body.device.id) && !status.refused(body.device.id)
    const result: PairLinkResult = { device: self, accepts }
    return Response.json(result, { headers: { 'cache-control': 'no-store' } })
  },
})
