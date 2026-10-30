import { ed25519 } from '@noble/curves/ed25519.js'
import { randomBytes, utf8ToBytes } from '@noble/hashes/utils.js'
import type { KeyPair, Signer } from '@sand/devices-contract'
import { decodeBase64url, encodeBase64url } from './base64url'

const nonceBytes = 32

export const sign = (payload: string, secretKey: string) => encodeBase64url(ed25519.sign(utf8ToBytes(payload), decodeBase64url(secretKey)))

export const verify = (payload: string, signature: string, publicKey: string) => {
  try {
    return ed25519.verify(decodeBase64url(signature), utf8ToBytes(payload), decodeBase64url(publicKey))
  } catch {
    return false
  }
}

export const signerOf = (keys: KeyPair): Signer => ({
  publicKey: keys.publicKey,
  sign: payload => sign(payload, keys.secretKey),
})

export const newNonce = () => encodeBase64url(randomBytes(nonceBytes))
