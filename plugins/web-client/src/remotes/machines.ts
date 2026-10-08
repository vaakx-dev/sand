import type { DeviceInfo, Machine, Machines, Remote, Wire } from '@sand/protocol'
import type { Context } from 'drydock'
import type { Links } from './links'
import { thisDevice } from './route'

const host = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export const createMachines = (ctx: Context, wire: Wire, links: Links): Machines => {
  let self: DeviceInfo | undefined

  const refresh = async () => {
    self = await wire.call<DeviceInfo>({ type: 'device.info' }, thisDevice).catch(() => undefined)
    links.sync(await wire.call<Remote[]>({ type: 'remotes.list' }, thisDevice).catch(() => []))
  }

  ctx.on('wire.hello', () => void refresh())
  ctx.on('wire.state', () => ctx.emit('machines.change'))
  ctx.on('wire.event', event => {
    if (event.name === 'remotes.change') links.sync(event.args[0])
  })

  const list = (): Machine[] => [
    { id: self?.id ?? 'local', name: self?.name ?? 'This PC', local: true, online: wire.state() === 'open', platform: self?.platform },
    ...links.list().map(({ remote, state }) => ({
      id: remote.id,
      name: remote.name,
      local: false,
      online: state() === 'open',
      platform: remote.platform,
      address: host(remote.url),
    })),
  ]

  return {
    list,
    get: id => list().find(machine => (id ? machine.id === id : machine.local)),
    async add(link) {
      const remote = await wire.call<Remote>({ type: 'remotes.add', link }, thisDevice)
      await refresh()
      return list().find(machine => machine.id === remote.id)!
    },
    remove: id => wire.call({ type: 'remotes.remove', id }, thisDevice).then(() => undefined),
  }
}
