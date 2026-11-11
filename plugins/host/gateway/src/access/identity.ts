import { deviceParams, type IdentityReply, type ThisPc } from '@sand/devices-contract'
import { identityProof } from '@sand/devices-identity'
import { textReply } from '@sand/util/host'
import { json } from '../http/reply'
import type { Nonces } from './keys'

const nonceLimit = 256

export const tooLong = (nonce: string) => nonce.length > nonceLimit

export const identityReply = async (thisPc: ThisPc, clientNonce: string, nonce: string): Promise<IdentityReply> => {
  const identity = await thisPc.identity()
  return { ...identity, nonce, signature: await thisPc.signer.sign(identityProof(clientNonce, nonce, identity.id)), signedSocket: true }
}

export const createIdentityRoute = (thisPc: ThisPc, nonces: Nonces) => async (request: Request) => {
  const clientNonce = new URL(request.url).searchParams.get(deviceParams.nonce)
  if (!clientNonce || tooLong(clientNonce)) return textReply(`expected ?${deviceParams.nonce}=`, 400)
  return json(await identityReply(thisPc, clientNonce, nonces.issue(true).secret))
}
