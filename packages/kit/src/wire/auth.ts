import type { PairInvite, PairRequest, PairResult } from '@sand/host-devices/contract'
import type { HostIdentity, Ticket } from '@sand/host-gateway/contract'
import type { BuildInfo } from '@sand/protocol'
import { hostPaths } from './pairing'

const timeout = 5000

export const bearer = (key: string) => ({ authorization: `Bearer ${key}` })

const endpoint = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`

const failure = async (response: Response) => new Error((await response.text()) || `HTTP ${response.status}`)

const json = async <T>(response: Response): Promise<T> => {
  if (!response.ok) throw await failure(response)
  return (await response.json()) as T
}

interface IdentityAnswer {
  deviceId?: string
  id?: string
  name?: string
  version?: string
  build?: { id?: unknown; time?: unknown }
}

const readBuild = (build: IdentityAnswer['build']): BuildInfo | undefined => {
  if (typeof build?.id !== 'string' || !build.id) return
  if (typeof build.time !== 'number' || !Number.isFinite(build.time)) return
  return { id: build.id, time: build.time }
}

export const fetchHostIdentity = async (base: string, wait = timeout): Promise<HostIdentity> => {
  const body = await json<IdentityAnswer>(await fetch(endpoint(base, hostPaths.identity), { signal: AbortSignal.timeout(wait) }))
  const deviceId = body?.deviceId ?? body?.id
  if (!deviceId) throw new Error(`${base} did not say which PC it is`)
  const build = readBuild(body.build)
  return { deviceId, name: body.name ?? '', version: body.version ?? '', ...(build && { build }) }
}

export const redeemPairing = async (base: string, request: PairRequest): Promise<PairResult> =>
  json<PairResult>(
    await fetch(endpoint(base, hostPaths.pair), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeout),
    }),
  )

export const requestTicket = async (base: string, key: string): Promise<Ticket | undefined> => {
  const response = await fetch(endpoint(base, hostPaths.ticket), { method: 'POST', headers: bearer(key), signal: AbortSignal.timeout(timeout) })
  if (response.status === 401 || response.status === 403) return
  return json<Ticket>(response)
}

export const createInvite = async (base: string, key: string): Promise<PairInvite> =>
  json<PairInvite>(await fetch(endpoint(base, hostPaths.invite), { method: 'POST', headers: bearer(key), signal: AbortSignal.timeout(timeout) }))
