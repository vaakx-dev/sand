import type { DeviceInfo } from '@sand/protocol'
import type { SyncCall } from '@sand/kit'
import { ask } from '../../daemon/ask'
import { requireRunning } from '../../daemon/info'
import { readRemotes } from '../../daemon/remotes'

const syncTimeout = 10 * 60_000

const thisPc = new Set(['this', 'local'])

export interface Pc {
  device?: string
  name: string
  url: string
  key: string
}

export interface Pcs {
  all: Pc[]
  local: Pc
  call: SyncCall
  named(name: string): Pc
}

export const connectPcs = async (home: string): Promise<Pcs> => {
  const info = await requireRunning(home)
  const [device, remotes] = await Promise.all([ask<DeviceInfo>(info, { type: 'device.info' }), readRemotes(home)])
  const local: Pc = { name: device.name, url: info.url, key: info.key }
  const all = [local, ...remotes.map(({ id, name, url, key }): Pc => ({ device: id, name, url, key }))]

  const call: SyncCall = (request, device) => {
    const pc = all.find(candidate => candidate.device === device)
    if (!pc) throw new Error(`unknown PC ${device}`)
    return ask(pc, request, request.type.startsWith('sync.') ? syncTimeout : undefined)
  }

  const named = (name: string) => {
    const wanted = name.toLowerCase()
    if (thisPc.has(wanted)) return local
    const found = all.find(pc => pc.name.toLowerCase() === wanted || pc.device === name)
    if (!found) throw new Error(`no PC named "${name}"; known: ${all.map(pc => pc.name).join(', ')}`)
    return found
  }

  return { all, local, call, named }
}
