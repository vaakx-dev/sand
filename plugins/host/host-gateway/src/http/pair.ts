import type { HostDevices, PairBack, PairRequest, PairResult } from '@sand/host-devices/contract'
import { parsePeerLink, readJson, textReply } from '@sand/kit/host'
import type { DeviceInfo, DeviceKind } from '@sand/protocol'
import { json } from './reply'

const limit = 8192
const kinds = new Set<string>(['pc', 'phone', 'browser'])

const pairBack = (value: unknown): PairBack | undefined => {
  const link = parsePeerLink(value)
  return link?.key ? { ...link, key: link.key } : undefined
}

const pairRequest = (body: unknown): PairRequest | undefined => {
  if (!body || typeof body !== 'object') return undefined
  const { secret, name, kind, back } = body as Record<string, unknown>
  if (typeof secret !== 'string' || !secret || typeof name !== 'string' || typeof kind !== 'string') return undefined
  if (!kinds.has(kind)) return undefined
  const peer = kind === 'pc' ? pairBack(back) : undefined
  return { secret, name, kind: kind as DeviceKind, ...(peer && { back: peer }) }
}

const reachable = (urls: string[], request: Request) => (urls.length ? urls : [new URL(request.url).origin])

export interface PairOptions {
  identity: DeviceInfo
  devices: Pick<HostDevices, 'redeem'>
  routeUrls(): string[]
  accept(back: PairBack, address?: string): Promise<boolean>
}

export const createPairHandler =
  ({ identity, devices, routeUrls, accept }: PairOptions) =>
  async (request: Request, address?: string) => {
    const pair = pairRequest(await readJson(request, limit))
    if (!pair) return textReply('expected {secret, name, kind} as JSON', 400)
    const paired = await devices.redeem(pair)
    if (!paired) return textReply('This pairing link has expired or was already used', 403)
    const back = pair.back ? await accept(pair.back, address).catch(() => false) : false
    const result: PairResult = { deviceId: paired.device.id, key: paired.key, host: identity, urls: reachable(routeUrls(), request), back }
    return json(result)
  }
