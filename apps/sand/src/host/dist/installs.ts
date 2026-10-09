import type { HostHealth, InstallProgress, InstallStage, InstallStep, InstallTicket } from '@sand/protocol'
import { hashSecret, randomSecret } from '../secrets'

export interface InstallGrant {
  id: string
  expires: number
  started: boolean
  name?: string
}

interface InstallKeyOptions {
  ttl?: number
  working?: number
  report?: (progress: InstallProgress) => void
}

interface StepDetail {
  name?: string
  plugins?: number
  accounts?: string[]
  error?: string
  health?: HostHealth
}

const stages: Record<InstallStep, InstallStage> = {
  connected: 'installing',
  sand: 'installing',
  plugins: 'installing',
  pairing: 'joining',
  checking: 'joining',
  sharing: 'sharing',
  ready: 'ready',
  failed: 'failed',
}

export const createInstallKeys = ({ ttl = 10 * 60_000, working = 30 * 60_000, report }: InstallKeyOptions = {}) => {
  const grants = new Map<string, InstallGrant>()

  const dropExpired = () => {
    const now = Date.now()
    for (const [hash, grant] of grants) if (grant.expires <= now) grants.delete(hash)
  }

  const check = (secret: string): InstallGrant | undefined => {
    dropExpired()
    return grants.get(hashSecret(secret))
  }

  return {
    issue(): InstallTicket {
      dropExpired()
      const id = Bun.randomUUIDv7()
      const secret = randomSecret()
      const expires = Date.now() + ttl
      grants.set(hashSecret(secret), { id, expires, started: false })
      return { id, secret, expires }
    },
    check,
    step(secret: string, step: InstallStep, extra: StepDetail = {}): InstallGrant | undefined {
      const grant = check(secret)
      if (!grant) return
      if (!grant.started) {
        grant.started = true
        grant.expires = Math.max(grant.expires, Date.now() + working)
      }
      if (extra.name) grant.name = extra.name
      report?.({ install: grant.id, step, stage: stages[step], at: Date.now(), ...(grant.name ? { name: grant.name } : {}), ...extra })
      return grant
    },
    finish(secret: string): void {
      grants.delete(hashSecret(secret))
    },
    cancel(id: string): void {
      for (const [hash, grant] of grants) if (grant.id === id && !grant.started) grants.delete(hash)
    },
  }
}

export type InstallKeys = ReturnType<typeof createInstallKeys>
