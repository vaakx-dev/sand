import { timingSafeEqual } from 'node:crypto'

export const randomSecret = (bytes = 32) => Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url')

export const hashSecret = (secret: string) => new Bun.CryptoHasher('sha256').update(secret).digest('hex')

export const sameHash = (a: string, b: string) => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
