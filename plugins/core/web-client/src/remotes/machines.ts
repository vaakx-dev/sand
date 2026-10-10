import type { Remote } from '@sand/host-remotes/contract'
import type { DeviceInfo } from '@sand/protocol'
import type { ConnectionInfo, Machine, Machines, Wire } from '../contract'
import type { Context } from 'drydock'
import { hostOf } from '../connection/url'
import type { HomeWire } from '../wire/wire'
import type { Links } from './links'
import { thisDevice } from './route'

const addressOf = (url: string | undefined) => (url ? hostOf(url) : undefined)

const online = (connection: ConnectionInfo) => connection.status === 'connected'

export const createMachines = (ctx: Context, wire: Wire, home: HomeWire, links: Links): Machines => {
  let self: DeviceInfo | undefined

  const refresh = async () => {
    self = await wire.call<DeviceInfo>({ type: 'device.info' }, thisDevice).catch(() => undefined)
    const remotes = await wire.call<Remote[]>({ type: 'remotes.list' }, thisDevice).catch(() => undefined)
    if (remotes) links.sync(remotes)
  }

  ctx.on('wire.hello', () => void refresh())
  ctx.on('wire.event', event => {
    if (event.name === 'remotes.change') links.sync(event.args[0])
  })

  const localMachine = (): Machine => {
    const connection = home.info()
    return {
      id: self?.id ?? 'local',
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
    device: remote.id,
    name: remote.name,
    local: false,
    online: online(connection),
    platform: remote.platform,
    address: addressOf(connection.url ?? remote.url),
    build: connection.build ?? remote.build,
    connection,
  })

  const list = () => [localMachine(), ...links.list().map(link => remoteMachine(link.remote, link.info()))]

  const get = (id?: string) => list().find(machine => (id ? machine.id === id : machine.local))

  return {
    list,
    get,
    name: device => get(device)?.name ?? 'Unknown PC',
    online: device => get(device)?.online ?? false,
    async add(link) {
      const remote = await wire.call<Remote>({ type: 'remotes.add', link }, thisDevice)
      await refresh()
      const machine = get(remote.id)
      if (!machine) throw new Error(`${remote.name} was added, but this page could not load it. Reload to see it.`)
      return machine
    },
    remove: id => wire.call({ type: 'remotes.remove', remote: id }, thisDevice).then(() => undefined),
    retry(id) {
      if (!id || id === localMachine().id) home.nudge()
      else links.get(id)?.nudge()
    },
  }
}
