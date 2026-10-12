import type { WirePairing } from '../contract'
import { hostKeys } from '../auth/keys'
import { transact, under } from '../integrations/indexed-db'

interface Scope {
  host: string
  key: string
}

export const scopeOf = ({ host, device }: WirePairing): Scope => ({ host, key: `${host}/${device}` })

export const savedScope = (host: string): Scope | undefined => {
  const device = hostKeys.get(host)?.device
  return device ? scopeOf({ host, device }) : undefined
}

export const wipeScope = (scope: string) =>
  transact('readwrite', pick => {
    pick('meta').delete(scope)
    pick('meta').delete(under(scope))
    for (const store of ['threads', 'tails', 'entries'] as const) pick(store).delete(under(scope))
    return () => undefined
  })

export const otherScopes = (scope: string) =>
  transact('readonly', pick => {
    const keys = pick('meta').getAllKeys()
    return () => (keys.result as IDBValidKey[]).filter((key): key is string => typeof key === 'string' && key !== scope)
  })
