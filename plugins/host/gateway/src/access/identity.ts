import { deviceParams, type IdentityReply, type ThisPc } from '@sand/devices-contract'
import { identityProof } from '@sand/devices-identity'
import { textReply } from '@sand/util/host'
import { json } from '../http/reply'
import type { Nonces } from './keys'

const nonceLimit = 256

export const createIdentityRoute = (thisPc: ThisPc, nonces: Nonces) => async (request: Request) => {
  const clientNonce = new URL(request.url).searchParams.get(deviceParams.nonce)
  if (!clientNonce || clientNonce.length > nonceLimit) return textReply(`expected ?${deviceParams.nonce}=`, 400)
  const { secret: nonce } = nonces.issue(true)
  const identity = await thisPc.identity()
  const reply: IdentityReply = { ...identity, nonce, signature: thisPc.signer.sign(identityProof(clientNonce, nonce, identity.id)) }
  return json(reply)
}
