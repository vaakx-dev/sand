import { hashSecret, randomSecret } from '@sand/kit/fs'

const inviteTtl = 10 * 60_000

export const createInvites = (ttl = inviteTtl) => {
  const pending = new Map<string, number>()
  const sweep = (now: number) => {
    for (const [hash, expires] of pending) if (expires <= now) pending.delete(hash)
  }
  return {
    create() {
      const now = Date.now()
      sweep(now)
      const secret = randomSecret()
      const expires = now + ttl
      pending.set(hashSecret(secret), expires)
      return { secret, expires }
    },
    take(secret: string) {
      sweep(Date.now())
      const hash = hashSecret(secret)
      const expires = pending.get(hash)
      pending.delete(hash)
      return expires
    },
  }
}

export type Invites = ReturnType<typeof createInvites>
