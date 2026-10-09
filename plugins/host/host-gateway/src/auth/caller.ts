import type { HostDevices } from '@sand/host-devices/contract'
import { hashSecret, sameHash } from '@sand/kit/fs'

export const adminDevice = 'admin'

const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const forwarding = ['x-forwarded-for', 'forwarded', 'x-forwarded-host', 'tailscale-user-login']
const scheme = /^Bearer\s+(\S+)\s*$/i

export type Caller = (request: Request, address?: string) => string | undefined

const bearerKey = (request: Request) => scheme.exec(request.headers.get('authorization') ?? '')?.[1]

const isForwarded = (request: Request) => forwarding.some(header => request.headers.has(header))

const isLocal = (request: Request, address?: string) => Boolean(address && loopback.has(address)) && !isForwarded(request)

export const createCaller = (admin: string, devices: Pick<HostDevices, 'verify'>): Caller => {
  const adminHash = hashSecret(admin)
  return (request, address) => {
    const key = bearerKey(request)
    if (!key) return undefined
    if (sameHash(hashSecret(key), adminHash)) return isLocal(request, address) ? adminDevice : undefined
    return devices.verify(key)?.id
  }
}
