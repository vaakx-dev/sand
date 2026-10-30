import {
  deviceParams,
  devicePaths,
  type IdentityReply,
  type JoinBody,
  type JoinStatus,
  type JoinTicket,
  joinRequestPath,
  type PairBody,
  type PairReply,
  type PcIdentity,
} from '@sand/devices-contract'
import { deviceIdOf, identityProof, newNonce, verify } from '@sand/devices-identity'
import { isRecord } from '@sand/util'

const timeout = 10_000

const refusalText: Record<string, string> = {
  invalid: 'the link has expired or was already used',
  'wrong-kind': 'the link is for a phone or browser, not a PC',
  'not-private': 'that PC only takes join requests from your home network or Tailscale',
  'rate-limited': 'that PC got too many join requests; try again in a minute',
  'already-paired': 'this PC is already paired with it',
}

const failure = async (base: string, response: Response) => {
  const body: unknown = await response.json().catch(() => undefined)
  const reason = isRecord(body) && typeof body.reason === 'string' ? refusalText[body.reason] : undefined
  return new Error(`${new URL(base).host} said no: ${reason ?? `HTTP ${response.status}`}`)
}

const call = async <T>(base: string, path: string, body?: unknown): Promise<T> => {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    ...(body !== undefined && { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw await failure(base, response)
  return (await response.json()) as T
}

const checks = (reply: IdentityReply, nonce: string) => {
  try {
    return deviceIdOf(reply.publicKey) === reply.id && verify(identityProof(nonce, reply.nonce, reply.id), reply.signature, reply.publicKey)
  } catch {
    return false
  }
}

export const fetchIdentity = async (base: string): Promise<PcIdentity> => {
  const nonce = newNonce()
  const reply = await call<IdentityReply>(base, `${devicePaths.identity}?${deviceParams.nonce}=${encodeURIComponent(nonce)}`)
  if (!isRecord(reply) || !checks(reply, nonce)) throw new Error(`${base} is not a sand PC`)
  const { id, name, platform, publicKey, build } = reply
  return { id, name, platform, publicKey, ...(build && { build }) }
}

export const postPair = (base: string, body: PairBody) => call<PairReply>(base, devicePaths.pair, body)

export const askToJoin = (base: string, body: JoinBody) => call<JoinTicket>(base, devicePaths.joinRequest, body)

export const cancelJoin = async (base: string, id: string) => {
  const response = await fetch(`${base}${devicePaths.joinCancel}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw await failure(base, response)
}

export const joinStatus = (base: string, id: string) => call<JoinStatus>(base, joinRequestPath(id))
