import { transact, under } from '../integrations/indexed-db'

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
