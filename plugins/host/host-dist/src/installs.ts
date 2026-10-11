import { hashSecret, randomSecret } from '@sand/kit/fs'
import type { InstallProgress, InstallStage, InstallStep, InstallTicket } from './contract'

interface InstallGrant {
  id: string
  expires: number
  started: boolean
  name?: string
}

type StepDetail = Pick<InstallProgress, 'name' | 'plugins' | 'accounts' | 'error' | 'health'>

const ttl = 10 * 60_000
const working = 30 * 60_000

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

export const createInstallKeys = (report: (progress: InstallProgress) => void) => {
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
      report({ install: grant.id, step, stage: stages[step], at: Date.now(), ...(grant.name ? { name: grant.name } : {}), ...extra })
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
