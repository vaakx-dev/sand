import type { IdentityReply } from '@sand/devices-contract'
import { lazy } from '@sand/util'
import { z } from 'zod'
import { deviceIdOf } from './keys'
import { identityProof } from './payloads'
import { verify } from './sign'

const replySchema = lazy(() =>
  z.object({ id: z.string(), name: z.string(), platform: z.string(), publicKey: z.string(), nonce: z.string(), signature: z.string() }),
)

export const isIdentityReply = (value: unknown): value is IdentityReply => replySchema().safeParse(value).success

const ownsId = (reply: IdentityReply) => {
  try {
    return deviceIdOf(reply.publicKey) === reply.id
  } catch {
    return false
  }
}

export const provesIdentity = async (reply: IdentityReply, clientNonce: string) =>
  ownsId(reply) && verify(identityProof(clientNonce, reply.nonce, reply.id), reply.signature, reply.publicKey)
