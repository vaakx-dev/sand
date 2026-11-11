import type { IdentityReply } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { deviceIdOf } from './keys'
import { identityProof } from './payloads'
import { verify } from './sign'

const textFields = ['id', 'name', 'platform', 'publicKey', 'nonce', 'signature'] as const

export const isIdentityReply = (value: unknown): value is IdentityReply => isRecord(value) && textFields.every(field => typeof value[field] === 'string')

const ownsId = (reply: IdentityReply) => {
  try {
    return deviceIdOf(reply.publicKey) === reply.id
  } catch {
    return false
  }
}

export const provesIdentity = async (reply: IdentityReply, clientNonce: string) =>
  ownsId(reply) && verify(identityProof(clientNonce, reply.nonce, reply.id), reply.signature, reply.publicKey)
