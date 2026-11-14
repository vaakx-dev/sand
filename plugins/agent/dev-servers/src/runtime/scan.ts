import { type Listener, listeners } from '@sand/machine'
import type { OwnedTree, Processes } from '@sand/processes/contract'
import type { DevServer } from '../contract'
import { loopbackOf, servesPages } from './probe'

interface Owner {
  tree: OwnedTree
  name: string
}

interface Probe {
  web: boolean
  at: number
}

interface Reachable extends Listener {
  address: string
  owner: Owner
}

const RETRY_PROBE_MS = 10_000

const ownersOf = (trees: OwnedTree[]) => {
  const owners = new Map<number, Owner>()
  for (const tree of trees) for (const entry of tree.processes) if (!owners.has(entry.pid)) owners.set(entry.pid, { tree, name: entry.name.replace(/\.exe$/i, '') })
  return owners
}

const reachable = (found: Listener[], owners: Map<number, Owner>) => {
  const byPort = new Map<number, Reachable>()
  for (const listener of found) {
    const address = loopbackOf(listener.host)
    const owner = owners.get(listener.pid)
    if (address && owner && !byPort.has(listener.port)) byPort.set(listener.port, { ...listener, address, owner })
  }
  return [...byPort.values()]
}

const keyOf = ({ pid, port }: Listener) => `${pid}:${port}`

export const createScanner = (processes: () => Processes | undefined) => {
  const probes = new Map<string, Probe>()

  const probed = async (listener: Reachable) => {
    const key = keyOf(listener)
    const known = probes.get(key)
    if (known && (known.web || Date.now() - known.at < RETRY_PROBE_MS)) return known.web
    const web = await servesPages(listener.address, listener.port)
    probes.set(key, { web, at: Date.now() })
    return web
  }

  const forget = (current: Set<string>) => {
    for (const key of probes.keys()) if (!current.has(key)) probes.delete(key)
  }

  const serverOf = (listener: Reachable): DevServer => {
    const { tree, name } = listener.owner
    return { port: listener.port, url: `http://localhost:${listener.port}`, address: listener.address, pid: listener.pid, name, command: tree.label, session: tree.conversation }
  }

  const scan = async () => {
    const owners = ownersOf((await processes()?.trees()) ?? [])
    const candidates = reachable(await listeners(owners.keys()), owners)
    forget(new Set(candidates.map(keyOf)))
    const web = await Promise.all(candidates.map(probed))
    return candidates.filter((_, index) => web[index]).map(serverOf)
  }

  return { scan }
}
