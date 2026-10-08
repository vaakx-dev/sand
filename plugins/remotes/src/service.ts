import type { DeviceInfo, Remote, Remotes } from '@sand/protocol'
import { connectRemote } from './client'
import { pair } from './pair'
import type { RemoteStore } from './store'

const named = (remote: Remote, name: string) => remote.name.toLowerCase() === name.toLowerCase() || remote.id === name

export const remotesService = (device: DeviceInfo, store: RemoteStore, changed: () => void): Remotes => ({
  device: () => device,
  list: store.list,
  find: name => store.list().find(remote => named(remote, name)),
  connect: remote => connectRemote(remote),
  async add(link) {
    const remote = await store.put(await pair(link, device))
    changed()
    return remote
  },
  async remove(id) {
    await store.remove(id)
    changed()
  },
})
