import { bearer, errorMessage } from '@sand/kit'
import { adminSocketUrl, PeerError, peerSocketUrl, peerUrl, readServerInfo, remoteStore, wireSocket, type WireSocket } from '@sand/kit/host'
import type {} from '@sand/host-devices/contract'
import type { DeviceInfo, RemoteRecord, WireRequest } from '@sand/protocol'
import type { Pc, ReachablePc } from './contract'

const ownServer = async (home: string) => {
  const info = await readServerInfo(home)
  if (!info) throw new Error("this PC's sand host is not running")
  return info
}

const failure = (name: string, error: unknown) =>
  error instanceof PeerError && error.state !== 'failed' ? errorMessage(error) : `${name}: ${errorMessage(error)}`

export const createConnections = (home: string) => {
  const own = wireSocket(async () => adminSocketUrl(await ownServer(home)))
  const peers = new Map<string, WireSocket>()
  const urls = new Map<string, Promise<string>>()
  let self: Promise<DeviceInfo> | undefined

  const here = () =>
    (self ??= (own.call({ type: 'device.info' }) as Promise<DeviceInfo>).catch(error => {
      self = undefined
      throw error
    }))

  const records = async () => (await remoteStore(home)).list()

  const recordOf = async (id: string) => {
    const record = (await records()).find(candidate => candidate.id === id)
    if (!record) throw new Error(`${id} is not this PC or a PC paired with it`)
    return record
  }

  const peer = (record: RemoteRecord) => {
    const known = peers.get(record.id)
    if (known) return known
    const socket = wireSocket(() => peerSocketUrl(record))
    peers.set(record.id, socket)
    return socket
  }

  const reach = (record: RemoteRecord) => {
    const known = urls.get(record.id)
    if (known) return known
    const found = peerUrl(record).catch(error => {
      urls.delete(record.id)
      throw error
    })
    urls.set(record.id, found)
    return found
  }

  const forget = () => {
    for (const socket of peers.values()) socket.close()
    peers.clear()
    urls.clear()
  }

  const status = async (record: RemoteRecord): Promise<ReachablePc> => {
    const pc = { id: record.id, name: record.name, here: false }
    try {
      await peer(record).ready()
      return { ...pc, online: true }
    } catch (error) {
      return { ...pc, online: false, error: failure(record.name, error) }
    }
  }

  const all = async (): Promise<Pc[]> => {
    const [self, others] = await Promise.all([here(), records()])
    return [{ id: self.id, name: self.name, here: true }, ...others.map(({ id, name }) => ({ id, name, here: false }))]
  }

  const target = async (id: string) => {
    const self = await here()
    if (id === self.id) return { name: self.name, socket: own }
    const record = await recordOf(id)
    return { name: record.name, socket: peer(record) }
  }

  const server = async (id: string) => {
    const self = await here()
    if (id === self.id) return ownServer(home)
    const record = await recordOf(id)
    return { url: await reach(record), key: record.key }
  }

  return {
    here,
    async list(): Promise<ReachablePc[]> {
      const [self, others] = await Promise.all([here(), records()])
      return [{ id: self.id, name: self.name, here: true, online: true }, ...(await Promise.all(others.map(status)))]
    },
    async find(ref?: string) {
      const pcs = await all()
      const wanted = ref?.toLowerCase()
      const found = pcs.find(pc => (wanted ? pc.id === ref || pc.name.toLowerCase() === wanted : pc.here))
      if (!found) throw new Error(`No PC named "${ref}"; the PCs are ${pcs.map(pc => pc.name).join(', ')}`)
      return found
    },
    async call<T>(request: WireRequest, pc: string, timeout?: number) {
      const { name, socket } = await target(pc)
      try {
        return (await socket.call(request, timeout)) as T
      } catch (error) {
        throw new Error(failure(name, error), { cause: error })
      }
    },
    async fetch(path: string, init: RequestInit | undefined, pc: string) {
      const { url, key } = await server(pc)
      return fetch(new URL(path, url), { ...init, headers: bearer(key) })
    },
    forget,
    close() {
      forget()
      own.close()
    },
  }
}

export type Connections = ReturnType<typeof createConnections>
