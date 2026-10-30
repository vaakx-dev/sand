import type { Auth, AuthVerdict, ThisPc } from '@sand/devices-contract'
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
    onRevoke: listener =>
      registry.onRevoke(device => {
        if (device !== thisPc.id) listener(device)
      }),
  }
}
