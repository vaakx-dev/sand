import { bearer } from '@sand/kit'
import { longCall, remoteStore } from '@sand/kit/host'
import type { Daemon, DeviceInfo } from '@sand/protocol'
import type { SyncWire } from '@sand/sync/flows'

const thisPc = new Set(['this', 'local'])

export interface Pc {
  id: string
  name: string
  url: string
  key: string
}

export interface Pcs extends SyncWire {
  all: Pc[]
  local: Pc
  named(name: string): Pc
}

export const connectPcs = async (daemon: Daemon, home: string): Promise<Pcs> => {
  const info = await daemon.require()
  const [device, store] = await Promise.all([daemon.request<DeviceInfo>({ type: 'device.info' }), remoteStore(home)])
  const local: Pc = { id: device.id, name: device.name, url: info.url, key: info.key }
  const all = [local, ...store.list().map(({ id, name, url, key }): Pc => ({ id, name, url, key }))]

  const pcOf = (id: string) => {
    const pc = all.find(candidate => candidate.id === id)
    if (!pc) throw new Error(`${id} is not this PC or a PC paired with it`)
    return pc
  }

  const slow = (type: string) => type.startsWith('sync.') || type === 'transfers.pull'

  const call: SyncWire['call'] = (request, id) => daemon.request(request, { to: pcOf(id), timeout: slow(request.type) ? longCall : undefined })

  const fetchFrom: SyncWire['fetch'] = async (path, init, id) => {
    const { url, key } = pcOf(id)
    return fetch(new URL(path, url), { ...init, headers: bearer(key) })
  }

  const named = (name: string) => {
    const wanted = name.toLowerCase()
    if (thisPc.has(wanted)) return local
    const found = all.find(pc => pc.name.toLowerCase() === wanted || pc.id === name)
    if (!found) throw new Error(`no PC named "${name}"; known: ${all.map(pc => pc.name).join(', ')}`)
    return found
  }

  return { all, local, call, fetch: fetchFrom, named }
}
