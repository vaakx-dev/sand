import { deviceParams, devicePaths, type IdentityReply } from '@sand/devices-contract'
import { isIdentityReply, newNonce, provesIdentity } from '@sand/devices-identity'
import type { PcKeys } from '@sand/devices-identity/pc'
import { trimSlash } from '@sand/util'

const identityTimeout = 3000
const provesThisPc = async (reply: IdentityReply, keys: PcKeys, nonce: string) =>
  reply.id === keys.id && reply.publicKey === keys.publicKey && provesIdentity(reply, nonce)

export const ownIdentity = async (url: string, keys: PcKeys): Promise<IdentityReply> => {
  const nonce = newNonce()
  const response = await fetch(`${trimSlash(url)}${devicePaths.identity}?${deviceParams.nonce}=${encodeURIComponent(nonce)}`, {
    signal: AbortSignal.timeout(identityTimeout),
  })
  if (!response.ok) throw new Error(`sand at ${url} answered ${response.status}`)
  const reply: unknown = await response.json()
  if (!isIdentityReply(reply) || !(await provesThisPc(reply, keys, nonce))) throw new Error(`the sand at ${url} is not this PC's sand`)
  return reply
}
