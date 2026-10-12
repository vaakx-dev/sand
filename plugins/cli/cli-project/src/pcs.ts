import { bearer } from '@sand/kit'
import { remoteStore } from '@sand/kit/host'
import type { Daemon, DeviceInfo } from '@sand/protocol'
import type { SyncWire } from '@sand/sync/flows'

const syncTimeout = 10 * 60_000

const thisPc = new Set(['this', 'local'])

export interface Pc {
  device?: string
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
  const local: Pc = { name: device.name, url: info.url, key: info.key }
  const all = [local, ...store.list().map(({ id, name, url, key }): Pc => ({ device: id, name, url, key }))]

  const pcOf = (device?: string) => {
    const pc = all.find(candidate => candidate.device === device)
    if (!pc) throw new Error(`unknown PC ${device}`)
    return pc
  }

  const slow = (type: string) => type.startsWith('sync.') || type === 'transfers.pull'

  const call: SyncWire['call'] = (request, device) => daemon.request(request, { to: pcOf(device), timeout: slow(request.type) ? syncTimeout : undefined })

  const fetchFrom: SyncWire['fetch'] = async (path, init, device) => {
    const { url, key } = pcOf(device)
    return fetch(new URL(path, url), { ...init, headers: bearer(key) })
  }

  const named = (name: string) => {
    const wanted = name.toLowerCase()
    if (thisPc.has(wanted)) return local
    const found = all.find(pc => pc.name.toLowerCase() === wanted || pc.device === name)
    if (!found) throw new Error(`no PC named "${name}"; known: ${all.map(pc => pc.name).join(', ')}`)
    return found
  }

  return { all, local, call, fetch: fetchFrom, named }
}
