import type { Remote } from '@sand/host-remotes/contract'
import type { DeviceInfo } from '@sand/protocol'
import type { ConnectionInfo, Machine, Machines, Wire } from '../contract'
import type { Context } from 'drydock'
import type { Links } from './links'
import { thisDevice } from './route'

interface Home {
  info(): ConnectionInfo
  nudge(): void
}

const hostOf = (url: string | undefined) => {
  if (!url) return undefined
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export const machineChanges = (ctx: Context) => {
  let queued = false
  return () => {
    if (queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      ctx.emit('machines.change')
    })
  }
}

export const createMachines = (ctx: Context, wire: Wire, home: Home, links: Links): Machines => {
  let self: DeviceInfo | undefined

  const refresh = async () => {
    self = await wire.call<DeviceInfo>({ type: 'device.info' }, thisDevice).catch(() => undefined)
    links.sync(await wire.call<Remote[]>({ type: 'remotes.list' }, thisDevice).catch(() => []))
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
      online: connection.status === 'connected',
      platform: self?.platform,
      address: hostOf(connection.url),
      build: self?.build ?? connection.build,
      connection,
    }
  }

  const list = (): Machine[] => [
    localMachine(),
    ...links.list().map(({ remote, info }) => {
      const connection = info()
      return {
        id: remote.id,
        name: remote.name,
        local: false,
        online: connection.status === 'connected',
        platform: remote.platform,
        address: hostOf(connection.url ?? remote.url),
        build: connection.build ?? remote.build,
        connection,
      }
    }),
  ]

  return {
    list,
    get: id => list().find(machine => (id ? machine.id === id : machine.local)),
    async add(link) {
      const remote = await wire.call<Remote>({ type: 'remotes.add', link }, thisDevice)
      await refresh()
      return list().find(machine => machine.id === remote.id)!
    },
    remove: id => wire.call({ type: 'remotes.remove', remote: id }, thisDevice).then(() => undefined),
    retry(id) {
      if (!id || id === localMachine().id) home.nudge()
      else links.get(id)?.nudge()
    },
  }
}
