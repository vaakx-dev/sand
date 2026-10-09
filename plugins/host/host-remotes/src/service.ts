import type { DeviceRemoval, HostDevices, PairBack, PairLinkRequest } from '@sand/host-devices/contract'
import { toRemote, type RemoteStore } from '@sand/kit/host'
import type { DeviceInfo } from '@sand/protocol'
import { peerUrls } from './address'
import type { Remote, RemoteRecord } from './contract'
import { inviteAt } from './invite'
import type { Status } from './link/status'
import { pairWith, unpair } from './pair'

export interface RemotesOptions {
  store: RemoteStore
  self: DeviceInfo
  devices: Pick<HostDevices, 'mint' | 'remove'>
  status: Status
  urls(): string[]
  changed(remotes: Remote[]): void
}

export const createRemotes = ({ store, self, devices, status, urls, changed }: RemotesOptions) => {
  const list = () => store.list().map(toRemote)
  const known = (id: string) => {
    const record = store.get(id)
    if (!record) throw new Error('Unknown PC')
    return record
  }
  const save = async (record: RemoteRecord) => {
    await store.put(record)
    changed(list())
  }
  const learn = (id: string) => (next: string[]) => {
    const record = store.get(id)
    if (!record || !next.length || next.join(' ') === record.urls.join(' ')) return
    void save({ ...record, urls: next }).catch(() => {})
  }
  const forget = async (id: string) => {
    if (!store.get(id)) return
    await store.remove(id)
    status.forget(id)
    changed(list())
  }

  return {
    list,
    async add(link: string) {
      const { record } = await pairWith(link, { self, urls: urls(), mint: devices.mint })
      const previous = store.get(record.id)
      if (previous && previous.key !== record.key) await unpair(previous)
      status.accepted(record.id)
      await save(record)
      return toRemote(record)
    },
    async accept({ device, urls: offered, key }: PairBack, address?: string) {
      const routes = peerUrls(address, offered)
      if (!routes.length) return false
      await save({ id: device.id, name: device.name, platform: device.platform, url: routes[0]!, urls: routes, key })
      status.accepted(device.id)
      return true
    },
    async learn({ device, urls: offered }: PairLinkRequest, address?: string) {
      const record = store.get(device.id)
      const routes = peerUrls(address, offered)
      if (!record || !routes.length || routes.join(' ') === record.urls.join(' ')) return
      await save({ ...record, url: routes[0]!, urls: routes })
    },
    async remove(id: string) {
      const record = store.get(id)
      if (record) await unpair(record)
      await forget(id)
      await devices.remove(id, { told: true })
    },
    async removed({ device, told }: DeviceRemoval) {
      const record = store.get(device.id)
      if (!record) return
      if (!told) await unpair(record)
      await forget(device.id)
    },
    invite: (id: string) => inviteAt(known(id), learn(id)),
  }
}

export type RemotesService = ReturnType<typeof createRemotes>
