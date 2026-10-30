import { installCancel, installCreate, installList } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { Grants } from '../grants/grants'
import { pageLink } from '../grants/links'
import { installCommand } from './command'
import type { Installs } from './installs'

const installLife = 30 * 60_000

const httpUrl = (route: string) => {
  try {
    const url = new URL(route)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

const baseUrl = (route: string) => {
  const url = httpUrl(route)
  if (!url) throw new Error(`${route} is not an http address of this PC`)
  return url.origin
}

export const installRequests = (hub: Hub, grants: Grants, installs: Installs): (() => Dispose)[] => [
  () =>
    hub.handle(installCreate, ({ platform, route, channel }, caller) => {
      const base = baseUrl(route)
      const id = Bun.randomUUIDv7()
      const { token, expires } = grants.create('pc', caller.device, { install: id, life: installLife })
      installs.open(id, token, expires)
      return { id, command: installCommand(platform, pageLink(base, 'pair', token), channel), expires }
    }),
  () =>
    hub.handle(installCancel, ({ id }) => {
      grants.cancelInstall(id)
      installs.cancel(id)
    }),
  () => hub.handle(installList, () => installs.list()),
]
