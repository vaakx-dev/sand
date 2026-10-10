import type { Entry } from '@sand/messages'
import { transact, under, type PickStore } from '../integrations/indexed-db'
import { emptyMeta, type CachedThread, type Meta, type SummaryRecord, type TailRecord } from './records'

export interface CachedScope {
  meta: Meta
  summaries: SummaryRecord[]
  asked?: CachedThread
  saved: Record<string, unknown>
}

const byTime = (a: Entry, b: Entry) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const cachedThread = (pick: PickStore, scope: string, id: string) => {
  const tail = pick('tails').get([scope, id])
  const entries = pick('entries').getAll(under(scope, id))
  return (): CachedThread | undefined => {
    const found = entries.result as Entry[]
    return tail.result && found.length ? { tail: tail.result as TailRecord, entries: found.sort(byTime) } : undefined
  }
}

const savedIn = (pick: PickStore, scope: string) => {
  const keys = pick('meta').getAllKeys(under(scope))
  const values = pick('meta').getAll(under(scope))
  return (): Record<string, unknown> =>
    Object.fromEntries((keys.result as string[][]).map((key, i) => [key[1], (values.result as unknown[])[i]]))
}

export const readThread = (scope: string, id: string) => transact('readonly', pick => cachedThread(pick, scope, id))

export const readScope = (scope: string, asked: string | undefined) =>
  transact('readonly', pick => {
    const meta = pick('meta').get(scope)
    const summaries = pick('threads').getAll(under(scope))
    const thread = asked ? cachedThread(pick, scope, asked) : undefined
    const saved = savedIn(pick, scope)
    return (): CachedScope => ({
      meta: { ...emptyMeta(), ...(meta.result as Meta | undefined) },
      summaries: summaries.result as SummaryRecord[],
      asked: thread?.(),
      saved: saved(),
    })
  })
