import { transact, under } from './db'

export const savedIn = (meta: IDBObjectStore, scope: string) => {
  const keys = meta.getAllKeys(under(scope))
  const values = meta.getAll(under(scope))
  return (): Record<string, unknown> =>
    Object.fromEntries((keys.result as string[][]).map((key, i) => [key[1], (values.result as unknown[])[i]]))
}

export const writeSaved = (scope: string, values: [string, unknown][]) =>
  transact('readwrite', pick => {
    for (const [name, value] of values) pick('meta').put(value, [scope, name])
    return () => undefined
  })
