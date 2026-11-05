import { decodeBase64url, encodeBase64url } from '@sand/devices-identity'
import { expect, test } from 'bun:test'
import { encryptPush } from '../src/host/encrypt'

const rfc8291 = {
  plaintext: 'When I grow up, I want to be a watermelon',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  receiver: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  senderPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  senderPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  body:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

const senderKeys = async (): Promise<CryptoKeyPair> => {
  const raw = decodeBase64url(rfc8291.senderPublic)
  const jwk = { kty: 'EC', crv: 'P-256', x: encodeBase64url(raw.slice(1, 33)), y: encodeBase64url(raw.slice(33)) }
  const algorithm = { name: 'ECDH', namedCurve: 'P-256' }
  return {
    privateKey: await crypto.subtle.importKey('jwk', { ...jwk, d: rfc8291.senderPrivate }, algorithm, false, ['deriveBits']),
    publicKey: await crypto.subtle.importKey('jwk', jwk, algorithm, true, []),
  }
}

test('a push message encrypts to the body in RFC 8291', async () => {
  const body = await encryptPush(
    new TextEncoder().encode(rfc8291.plaintext),
    { p256dh: rfc8291.receiver, auth: rfc8291.auth },
    { keys: await senderKeys(), salt: new Uint8Array(decodeBase64url(rfc8291.salt)) },
  )
  expect(encodeBase64url(body)).toBe(rfc8291.body)
})
