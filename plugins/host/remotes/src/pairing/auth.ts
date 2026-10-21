import type { HostIdentity, PairInvite, PairRequest, PairResult } from '@sand/host-devices/contract'
import { bearer, hostEndpoint, hostPaths, hostReply, hostTimeout, parseBuildInfo } from '@sand/util/boot/wire'

interface IdentityAnswer {
  deviceId?: string
  name?: string
  build?: unknown
}

export const fetchHostIdentity = async (base: string, wait = hostTimeout): Promise<HostIdentity> => {
  const body = await hostReply<IdentityAnswer>(await fetch(hostEndpoint(base, hostPaths.identity), { signal: AbortSignal.timeout(wait) }))
  const deviceId = body?.deviceId
  if (!deviceId) throw new Error(`${base} did not say which PC it is`)
  const build = parseBuildInfo(body.build)
  return { deviceId, name: body.name ?? '', ...(build && { build }) }
}

export const redeemPairing = async (base: string, request: PairRequest): Promise<PairResult> =>
  hostReply<PairResult>(
    await fetch(hostEndpoint(base, hostPaths.pair), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(hostTimeout),
    }),
  )

export const createInvite = async (base: string, key: string): Promise<PairInvite> =>
  hostReply<PairInvite>(await fetch(hostEndpoint(base, hostPaths.invite), { method: 'POST', headers: bearer(key), signal: AbortSignal.timeout(hostTimeout) }))
