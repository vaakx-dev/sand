import type { DeviceKind, GrantKind } from '@sand/devices-contract'
import { hashSecret, randomSecret } from '@sand/util/fs'

const lifetimes: Record<GrantKind, number> = {
  device: 10 * 60_000,
  pc: 10 * 60_000,
  handoff: 10 * 60_000,
}

export interface Grant {
  kind: GrantKind
  by: string
  expires: number
  device?: string
  install?: string
}

export interface GrantOptions {
  device?: string
  install?: string
  life?: number
}

export const grantAccepts = (grant: Grant, kind: DeviceKind, handoffKind?: DeviceKind) => {
  if (grant.kind === 'device') return kind === 'phone' || kind === 'browser'
  if (grant.kind === 'pc') return kind === 'pc'
  return kind === handoffKind
}

export const createGrants = () => {
  const grants = new Map<string, Grant>()

  const sweep = () => {
    const now = Date.now()
    for (const [hash, grant] of grants) if (grant.expires <= now) grants.delete(hash)
  }

  return {
    create(kind: GrantKind, by: string, options: GrantOptions = {}) {
      sweep()
      const token = randomSecret()
      const expires = Date.now() + (options.life ?? lifetimes[kind])
      grants.set(hashSecret(token), {
        kind,
        by,
        expires,
        ...(options.device && { device: options.device }),
        ...(options.install && { install: options.install }),
      })
      return { token, expires }
    },
    find(token: string) {
      sweep()
      return grants.get(hashSecret(token))
    },
    take(token: string) {
      const hash = hashSecret(token)
      const grant = grants.get(hash)
      grants.delete(hash)
      return grant
    },
    cancel(token: string) {
      grants.delete(hashSecret(token))
    },
    cancelInstall(install: string) {
      for (const [hash, grant] of grants) if (grant.install === install) grants.delete(hash)
    },
  }
}

export type Grants = ReturnType<typeof createGrants>
