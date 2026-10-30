import { sameHash } from '@sand/util/fs'

const valid = 86_400_000
const rounding = 3_600_000

export interface Checked {
  hash: string
  expires: number
}

export const createTokens = (key: Uint8Array) => {
  const mac = (hash: string, expires: number) => new Bun.CryptoHasher('sha256', key).update(`${hash}.${expires}`).digest('base64url')

  const issue = (hash: string) => {
    const expires = Math.ceil((Date.now() + valid) / rounding) * rounding
    return { token: `${hash}.${expires}.${mac(hash, expires)}`, expires }
  }

  const check = (token: string): Checked | undefined => {
    const [hash, stamp, given, ...rest] = token.split('.')
    const expires = Number(stamp)
    if (!hash || !given || rest.length || !Number.isSafeInteger(expires) || expires <= Date.now()) return undefined
    return sameHash(mac(hash, expires), given) ? { hash, expires } : undefined
  }

  return { issue, check }
}

export type Tokens = ReturnType<typeof createTokens>
