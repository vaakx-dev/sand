import type { Auth, AuthVerdict, ThisPc } from '@sand/devices-contract'
import { hashSecret } from '@sand/util/fs'
import type { HostRegistry } from './registry'

const unknown: AuthVerdict = { ok: false, reason: 'unknown' }

export const createAuth = (registry: HostRegistry, thisPc: Pick<ThisPc, 'id' | 'publicKey' | 'name'>): Auth => {
  const nameOf = (device: string) => registry.get(device)?.name ?? device

  return {
    identify(publicKey, local) {
      if (publicKey === thisPc.publicKey) return local ? { ok: true, caller: { device: thisPc.id, kind: 'cli' }, name: thisPc.name() } : unknown
      const record = registry.byKey(publicKey)
      if (!record) return unknown
      if (record.removed) return { ok: false, reason: 'removed', at: record.removed.at, by: nameOf(record.removed.by) }
      return { ok: true, caller: { device: record.id, kind: record.kind }, name: record.name }
    },
    agent(token) {
      const hash = hashSecret(token)
      const record = registry.list().find(candidate => candidate.agent?.token === hash)
      return record?.agent && { caller: { device: record.id, kind: 'agent' }, name: record.name, access: record.agent.access }
    },
    onRevoke: listener =>
      registry.onRevoke(device => {
        if (device !== thisPc.id) listener(device)
      }),
  }
}
