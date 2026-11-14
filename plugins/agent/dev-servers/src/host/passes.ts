import { hashSecret, randomSecret } from '@sand/util/fs'

interface Grant {
  device: string
  port: number
  until: number
}

const TICKET_MS = 10 * 60_000
const PASS_MS = 12 * 60 * 60_000

const grants = (lifetimeMs: number) => {
  const held = new Map<string, Grant>()

  const sweep = () => {
    const now = Date.now()
    for (const [hash, grant] of held) if (grant.until <= now) held.delete(hash)
  }

  const find = (secret: string, port: number) => {
    sweep()
    const grant = held.get(hashSecret(secret))
    return grant?.port === port ? grant : undefined
  }

  return {
    give(device: string, port: number) {
      sweep()
      const secret = randomSecret()
      held.set(hashSecret(secret), { device, port, until: Date.now() + lifetimeMs })
      return secret
    },
    find,
    take(secret: string, port: number) {
      const grant = find(secret, port)
      if (grant) held.delete(hashSecret(secret))
      return grant
    },
    drop(device: string) {
      for (const [hash, grant] of held) if (grant.device === device) held.delete(hash)
    },
  }
}

export const createPasses = () => {
  const tickets = grants(TICKET_MS)
  const passes = grants(PASS_MS)

  return {
    ticket: tickets.give,
    redeem(ticket: string, port: number) {
      const grant = tickets.take(ticket, port)
      return grant && passes.give(grant.device, port)
    },
    admits(pass: string, port: number) {
      const grant = passes.find(pass, port)
      if (grant) grant.until = Date.now() + PASS_MS
      return grant !== undefined
    },
    drop(device: string) {
      tickets.drop(device)
      passes.drop(device)
    },
  }
}

export type Passes = ReturnType<typeof createPasses>
