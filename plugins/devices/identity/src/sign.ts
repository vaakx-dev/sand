import { ed25519 } from '@noble/curves/ed25519.js'
import { randomBytes } from '@noble/hashes/utils.js'
import type { KeyPair, Signer } from '@sand/devices-contract'
import { decodeBase64url, encodeBase64url } from './base64url'

const nonceBytes = 32
const algorithm = { name: 'Ed25519' }
const pkcs8Prefix = Uint8Array.of(0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20)
const basePoint = decodeBase64url('WGZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmY')
const text = new TextEncoder()

let nativeSupport: Promise<boolean> | undefined

const subtle = () => globalThis.crypto?.subtle

const probeNative = async () => {
  const crypto = subtle()
  if (!crypto) return false
  return crypto.importKey('raw', basePoint, algorithm, false, ['verify']).then(
    () => true,
    () => false,
  )
}

const native = () => (nativeSupport ??= probeNative())

const pkcs8Of = (secret: Uint8Array) => {
  const der = new Uint8Array(pkcs8Prefix.length + secret.length)
  der.set(pkcs8Prefix)
  der.set(secret, pkcs8Prefix.length)
  return der
}

const signNatively = async (message: Uint8Array<ArrayBuffer>, secret: Uint8Array) => {
  const key = await subtle().importKey('pkcs8', pkcs8Of(secret), algorithm, false, ['sign'])
  return new Uint8Array(await subtle().sign(algorithm, key, message))
}

const verifyNatively = async (signature: Uint8Array<ArrayBuffer>, message: Uint8Array<ArrayBuffer>, publicKey: Uint8Array<ArrayBuffer>) => {
  const key = await subtle().importKey('raw', publicKey, algorithm, false, ['verify'])
  return subtle().verify(algorithm, key, signature, message)
}

export const sign = async (payload: string, secretKey: string) => {
  const message = text.encode(payload)
  const secret = decodeBase64url(secretKey)
  const signature = (await native()) ? await signNatively(message, secret) : ed25519.sign(message, secret)
  return encodeBase64url(signature)
}

export const verify = async (payload: string, signature: string, publicKey: string) => {
  try {
    const parts = [decodeBase64url(signature), text.encode(payload), decodeBase64url(publicKey)] as const
    return (await native()) ? await verifyNatively(...parts) : ed25519.verify(...parts)
  } catch {
    return false
  }
}

export const signerOf = (keys: KeyPair): Signer => ({
  publicKey: keys.publicKey,
  sign: payload => sign(payload, keys.secretKey),
})

export const newNonce = () => encodeBase64url(randomBytes(nonceBytes))
