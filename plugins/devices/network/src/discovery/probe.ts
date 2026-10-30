import { deviceParams, devicePaths, type IdentityReply, type PcIdentity } from '@sand/devices-contract'
import { deviceIdOf, identityProof, newNonce, verify } from '@sand/devices-identity'
import { isRecord } from '@sand/util'

const isReply = (value: unknown): value is IdentityReply =>
  isRecord(value) &&
  ['id', 'name', 'platform', 'publicKey', 'nonce', 'signature'].every(key => typeof value[key] === 'string')

const proves = (reply: IdentityReply, clientNonce: string) => {
  try {
    return deviceIdOf(reply.publicKey) === reply.id && verify(identityProof(clientNonce, reply.nonce, reply.id), reply.signature, reply.publicKey)
  } catch {
    return false
  }
}

export const probeIdentity = async (url: string, timeout: number): Promise<PcIdentity | undefined> => {
  const nonce = newNonce()
  const target = new URL(devicePaths.identity, url)
  target.searchParams.set(deviceParams.nonce, nonce)
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(timeout), redirect: 'error' })
    if (!response.ok) return undefined
    const reply: unknown = await response.json()
    if (!isReply(reply) || !proves(reply, nonce)) return undefined
    return { id: reply.id, name: reply.name, platform: reply.platform, publicKey: reply.publicKey }
  } catch {
    return undefined
  }
}
