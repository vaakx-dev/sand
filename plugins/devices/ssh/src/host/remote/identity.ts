import { deviceParams, devicePaths, type IdentityReply, type PcIdentity } from '@sand/devices-contract'
import { deviceIdOf, identityProof, newNonce, verify } from '@sand/devices-identity'
import { isRecord } from '@sand/util'

const fields = ['id', 'name', 'platform', 'publicKey', 'nonce', 'signature'] as const
const pause = 300
const fetchTimeout = 3000

const isReply = (value: unknown): value is IdentityReply => isRecord(value) && fields.every(field => typeof value[field] === 'string')

const proves = (reply: IdentityReply, nonce: string) => {
  try {
    return deviceIdOf(reply.publicKey) === reply.id && verify(identityProof(nonce, reply.nonce, reply.id), reply.signature, reply.publicKey)
  } catch {
    return false
  }
}

const identityAt = async (base: string): Promise<PcIdentity | undefined> => {
  const nonce = newNonce()
  const url = `${base}${devicePaths.identity}?${deviceParams.nonce}=${encodeURIComponent(nonce)}`
  const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeout) }).catch(() => undefined)
  const reply: unknown = response?.ok ? await response.json().catch(() => undefined) : undefined
  if (!isReply(reply) || !proves(reply, nonce)) return undefined
  const { id, name, platform, publicKey } = reply
  return { id, name, platform, publicKey }
}

export const reachIdentity = async (base: string, signal: AbortSignal): Promise<PcIdentity | undefined> => {
  while (!signal.aborted) {
    const found = await identityAt(base)
    if (found) return found
    await Bun.sleep(pause)
  }
}
