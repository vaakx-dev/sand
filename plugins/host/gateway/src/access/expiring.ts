import { hashSecret, randomSecret } from '@sand/util/fs'

export const createExpiring = <T>(ttl: number) => {
  const pending = new Map<string, { value: T; expires: number }>()

  const sweep = () => {
    const now = Date.now()
    for (const [hash, entry] of pending) if (entry.expires <= now) pending.delete(hash)
  }

  return {
    issue(value: T) {
      sweep()
      const secret = randomSecret()
      const expires = Date.now() + ttl
      pending.set(hashSecret(secret), { value, expires })
      return { secret, expires }
    },
    take(secret: string): T | undefined {
      sweep()
      const hash = hashSecret(secret)
      const entry = pending.get(hash)
      pending.delete(hash)
      return entry?.value
    },
    drop(matches: (value: T) => boolean) {
      for (const [hash, entry] of pending) if (matches(entry.value)) pending.delete(hash)
    },
  }
}
