import type { PushKeys } from '@sand/devices-contract'
import { decodeBase64url } from '@sand/devices-identity'

export interface Sender {
  keys: CryptoKeyPair
  salt: Uint8Array<ArrayBuffer>
}

const recordSize = 4096
const lastRecord = 2
const text = new TextEncoder()

const hkdf = async (salt: BufferSource, secret: BufferSource, info: BufferSource, bytes: number) => {
  const key = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

const contentInfo = (encoding: string) => text.encode(`Content-Encoding: ${encoding}\0`)

const header = (salt: Uint8Array, key: Uint8Array) => {
  const head = new Uint8Array(21)
  head.set(salt)
  new DataView(head.buffer).setUint32(16, recordSize)
  head[20] = key.length
  return head
}

export const encryptPush = async (plaintext: Uint8Array, receiver: PushKeys, { keys, salt }: Sender) => {
  const receiverRaw = decodeBase64url(receiver.p256dh)
  const receiverKey = await crypto.subtle.importKey('raw', receiverRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const senderRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey))
  const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, keys.privateKey, 256)
  const keyInfo = Buffer.concat([text.encode('WebPush: info\0'), receiverRaw, senderRaw])
  const secret = await hkdf(decodeBase64url(receiver.auth), shared, keyInfo, 32)
  const cek = await crypto.subtle.importKey('raw', await hkdf(salt, secret, contentInfo('aes128gcm'), 16), 'AES-GCM', false, ['encrypt'])
  const nonce = await hkdf(salt, secret, contentInfo('nonce'), 12)
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, Buffer.concat([plaintext, Uint8Array.of(lastRecord)]))
  return Buffer.concat([header(salt, senderRaw), senderRaw, new Uint8Array(sealed)])
}
