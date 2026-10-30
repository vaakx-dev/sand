import { deviceParams, devicePaths, type IdentityReply } from '@sand/devices-contract'
import { identityProof, newNonce, verify } from '@sand/devices-identity'
import type { PcKeys } from '@sand/devices-identity/pc'
import { isRecord, trimSlash } from '@sand/util'

const identityTimeout = 3000
const textFields = ['id', 'name', 'platform', 'publicKey', 'nonce', 'signature'] as const

const isIdentityReply = (value: unknown): value is IdentityReply => isRecord(value) && textFields.every(field => typeof value[field] === 'string')

const provesThisPc = (reply: IdentityReply, keys: PcKeys, nonce: string) =>
  reply.id === keys.id && reply.publicKey === keys.publicKey && verify(identityProof(nonce, reply.nonce, reply.id), reply.signature, reply.publicKey)

export const ownIdentity = async (url: string, keys: PcKeys): Promise<IdentityReply> => {
  const nonce = newNonce()
  const response = await fetch(`${trimSlash(url)}${devicePaths.identity}?${deviceParams.nonce}=${encodeURIComponent(nonce)}`, {
    signal: AbortSignal.timeout(identityTimeout),
  })
  if (!response.ok) throw new Error(`sand at ${url} answered ${response.status}`)
  const reply: unknown = await response.json()
  if (!isIdentityReply(reply) || !provesThisPc(reply, keys, nonce)) throw new Error(`the sand at ${url} is not this PC's sand`)
  return reply
}
