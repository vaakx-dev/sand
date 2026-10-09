import { hashSecret, randomSecret } from '@sand/kit/fs'
import type { Ticket } from '../contract'

const ttl = 30_000

export interface Tickets {
  issue(device: string): Ticket
  redeem(ticket: string): string | undefined
}

export const createTickets = (now: () => number = Date.now): Tickets => {
  const pending = new Map<string, { device: string; expires: number }>()

  const sweep = () => {
    const time = now()
    for (const [hash, entry] of pending) if (entry.expires <= time) pending.delete(hash)
  }

  return {
    issue(device) {
      sweep()
      const ticket = randomSecret()
      const expires = now() + ttl
      pending.set(hashSecret(ticket), { device, expires })
      return { ticket, expires }
    },
    redeem(ticket) {
      sweep()
      const hash = hashSecret(ticket)
      const entry = pending.get(hash)
      pending.delete(hash)
      return entry?.device
    },
  }
}
