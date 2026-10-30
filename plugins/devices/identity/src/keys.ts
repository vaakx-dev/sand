import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { KeyPair } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { decodeBase64url, encodeBase64url } from './base64url'

const deviceIdLength = 22

export const generateKeyPair = (): KeyPair => {
  const secret = ed25519.utils.randomSecretKey()
  return { publicKey: encodeBase64url(ed25519.getPublicKey(secret)), secretKey: encodeBase64url(secret) }
}

export const publicKeyOf = (secretKey: string) => encodeBase64url(ed25519.getPublicKey(decodeBase64url(secretKey)))

export const deviceIdOf = (publicKey: string) => encodeBase64url(sha256(decodeBase64url(publicKey))).slice(0, deviceIdLength)

export const isKeyPair = (value: unknown): value is KeyPair => {
  if (!isRecord(value) || typeof value.publicKey !== 'string' || typeof value.secretKey !== 'string') return false
  try {
    return publicKeyOf(value.secretKey) === value.publicKey
  } catch {
    return false
  }
}
