import { type DeviceInfo, deviceInfo } from '@sand/host-devices/contract'
import { type Remote, remotesAdd, remotesChange, remotesList, remotesRemove } from '@sand/host-remotes/contract'
import type { Context } from 'drydock'
import { type ConnectionInfo, type Machine, type Machines, wireHello } from '../contract'
import { hostOf } from '../connection/url'
import type { Listeners } from '../wire/listeners'
import type { HomeWire } from '../wire/wire'
import { keptRemotes } from './kept'
import type { Links } from './links'

const addressOf = (url: string | undefined) => (url ? hostOf(url) : undefined)

const online = (connection: ConnectionInfo) => connection.status === 'connected'

interface MachineParts {
  home: HomeWire
  on: Listeners['on']
  links: Links
  hereId: string
  keep(remotes: Remote[]): void
}

export const createMachines = (ctx: Context, { home, on, links, hereId, keep }: MachineParts) => {
  let self: DeviceInfo | undefined
  let listed = false

  const sync = (remotes: Remote[]) => {
    listed = true
    links.sync(remotes)
    keep(remotes)
  }

  const refresh = async () => {
    const [info, remotes] = await Promise.all([
      home.call(deviceInfo, {}).catch(() => undefined),
      home.call(remotesList, {}).catch(() => undefined),
    ])
    self = info
    if (remotes) sync(remotes)
  }

  ctx.on(wireHello, () => void refresh())
  ctx.effect(() => on(remotesChange, sync))

  const here = (): Machine => {
    const connection = home.info()
    return {
      id: hereId,
      name: self?.name ?? 'This PC',
      local: true,
      online: online(connection),
      platform: self?.platform,
      address: addressOf(connection.url),
      build: self?.build ?? connection.build,
      connection,
    }
  }

  const remoteMachine = (remote: Remote, connection: ConnectionInfo): Machine => ({
    id: remote.id,
    name: remote.name,
    local: false,
    online: online(connection),
    platform: remote.platform,
    address: addressOf(connection.url ?? remote.url),
    build: connection.build ?? remote.build,
    connection,
  })

  const list = () => [here(), ...links.list().map(link => remoteMachine(link.remote, link.info()))]

  const get = (id: string) => list().find(machine => machine.id === id)

  const machines: Machines = {
    list,
    here,
    get,
    name: id => get(id)?.name ?? 'Unknown PC',
    online: id => get(id)?.online ?? false,
    async add(link) {
      const remote = await home.call(remotesAdd, { link })
      await refresh()
      const machine = get(remote.id)
      if (!machine) throw new Error(`${remote.name} was added, but this page could not load it. Reload to see it.`)
      return machine
    },
    remove: id => home.call(remotesRemove, { remote: id }),
  }

  return {
    machines,
    restore(saved: unknown) {
      if (!listed) links.sync(keptRemotes(saved))
    },
  }
}
