import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { KeyPair } from '@sand/devices-contract'
import { lazy } from '@sand/util'
import { z } from 'zod'
import { decodeBase64url, encodeBase64url } from './base64url'

const deviceIdLength = 22
const keyBytes = 32

export const generateKeyPair = (): KeyPair => {
  const secret = ed25519.utils.randomSecretKey()
  return { publicKey: encodeBase64url(ed25519.getPublicKey(secret)), secretKey: encodeBase64url(secret) }
}

export const publicKeyOf = (secretKey: string) => encodeBase64url(ed25519.getPublicKey(decodeBase64url(secretKey)))

export const deviceIdOf = (publicKey: string) => encodeBase64url(sha256(decodeBase64url(publicKey))).slice(0, deviceIdLength)

const isKey = (value: string) => {
  try {
    return decodeBase64url(value).length === keyBytes
  } catch {
    return false
  }
}

const keySchema = lazy(() => z.string().refine(isKey))

const keyPairSchema = lazy(() => z.object({ publicKey: keySchema(), secretKey: keySchema() }))

export const isKeyPair = (value: unknown): value is KeyPair => keyPairSchema().safeParse(value).success

export const keysMatch = ({ publicKey, secretKey }: KeyPair) => publicKeyOf(secretKey) === publicKey
