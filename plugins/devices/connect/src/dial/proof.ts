import type { IdentityReply, PcIdentity } from '@sand/devices-contract'
import { provesIdentity } from '@sand/devices-identity'

export interface ExpectedPc {
  id: string
  publicKey?: string
}

const keyMatches = (reply: IdentityReply, expected: ExpectedPc) => expected.publicKey === undefined || reply.publicKey === expected.publicKey

export const provesPc = async (reply: IdentityReply, expected: ExpectedPc, clientNonce: string) =>
  reply.id === expected.id && keyMatches(reply, expected) && provesIdentity(reply, clientNonce)

export const identityOf = (reply: IdentityReply): PcIdentity => ({
  id: reply.id,
  name: reply.name,
  platform: reply.platform,
  publicKey: reply.publicKey,
  ...(reply.build && { build: reply.build }),
})
