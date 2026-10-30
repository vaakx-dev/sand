import type { IdentityReply, PcIdentity } from '@sand/devices-contract'
import { deviceIdOf, identityProof, verify } from '@sand/devices-identity'
import { isRecord } from '@sand/util'

const textFields = ['id', 'name', 'platform', 'publicKey', 'nonce', 'signature'] as const

export const isIdentityReply = (value: unknown): value is IdentityReply =>
  isRecord(value) && textFields.every(field => typeof value[field] === 'string')

export interface ExpectedPc {
  id: string
  publicKey?: string
}

const keyMatches = (reply: IdentityReply, expected: ExpectedPc) =>
  expected.publicKey === undefined ? deviceIdOf(reply.publicKey) === expected.id : reply.publicKey === expected.publicKey

export const provesPc = (reply: IdentityReply, expected: ExpectedPc, clientNonce: string) =>
  reply.id === expected.id &&
  keyMatches(reply, expected) &&
  verify(identityProof(clientNonce, reply.nonce, reply.id), reply.signature, reply.publicKey)

export const identityOf = (reply: IdentityReply): PcIdentity => ({
  id: reply.id,
  name: reply.name,
  platform: reply.platform,
  publicKey: reply.publicKey,
  ...(reply.build && { build: reply.build }),
})
