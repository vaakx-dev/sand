import type { HostDevices, PairBack, PairRequest, PairResult } from '@sand/host-devices/contract'
import type { DeviceInfo, DeviceKind } from '@sand/protocol'
import { readJson } from './body'
import { json, text } from './reply'

const limit = 8192
const kinds = new Set<string>(['pc', 'phone', 'browser'])

const word = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const deviceInfo = (value: unknown): DeviceInfo | undefined => {
  if (!value || typeof value !== 'object') return
  const { id, name, platform } = value as Record<string, unknown>
  if (!word(id) || !word(name)) return
  return { id, name, platform: typeof platform === 'string' ? platform : '' }
}

export const pairBack = (value: unknown): PairBack | undefined => {
  if (!value || typeof value !== 'object') return
  const { device, urls, key } = value as Record<string, unknown>
  const info = deviceInfo(device)
  if (!info || !word(key) || !Array.isArray(urls)) return
  return { device: info, urls: urls.filter(word).slice(0, 16), key }
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
    if (!pair) return text('expected {secret, name, kind} as JSON', 400)
    const paired = await devices.redeem(pair)
    if (!paired) return text('This pairing link has expired or was already used', 403)
    const back = pair.back ? await accept(pair.back, address).catch(() => false) : false
    const result: PairResult = { deviceId: paired.device.id, key: paired.key, host: identity, urls: reachable(routeUrls(), request), back }
    return json(result)
  }
