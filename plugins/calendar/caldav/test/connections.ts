import type { Account, Connections, Kind } from '@sand/connections/contract'

export const fakeConnections = (saved: { account: Account; values: Record<string, string> }[]) => {
  const kinds = new Map<string, Kind>()
  const service: Connections = {
    kind(kind) {
      kinds.set(kind.id, kind)
      return () => void kinds.delete(kind.id)
    },
    accounts: kind => saved.map(one => one.account).filter(account => !kind || account.kind === kind),
    fetch: () => Promise.reject(new Error('Form accounts sign their own requests')),
    values: id => ({ ...saved.find(one => one.account.id === id)!.values }),
    disconnect: async () => {},
  }
  return { service, kinds }
}

export const account = (id: string, kind: string, name: string): Account => ({ id, kind, name, readOnly: false, added: 0 })
