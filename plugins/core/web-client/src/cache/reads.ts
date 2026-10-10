import type { Entry } from '@sand/messages'
import { transact, under } from './db'
import { savedIn } from './saved'
import { emptyMeta, type CachedThread, type Meta, type SummaryRecord, type TailRecord } from './records'

export interface CachedScope {
  meta: Meta
  summaries: SummaryRecord[]
  asked?: CachedThread
  saved: Record<string, unknown>
}

const byTime = (a: Entry, b: Entry) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const threadOf = (tail: TailRecord | undefined, entries: Entry[]): CachedThread | undefined =>
  tail && entries.length ? { tail, entries: entries.sort(byTime) } : undefined

export const readThread = (scope: string, id: string) =>
  transact('readonly', pick => {
    const tail = pick('tails').get([scope, id])
    const entries = pick('entries').getAll(under(scope, id))
    return () => threadOf(tail.result as TailRecord | undefined, entries.result as Entry[])
  })

export const readScope = (scope: string, asked: string | undefined) =>
  transact('readonly', pick => {
    const meta = pick('meta').get(scope)
    const summaries = pick('threads').getAll(under(scope))
    const tail = asked ? pick('tails').get([scope, asked]) : undefined
    const entries = asked ? pick('entries').getAll(under(scope, asked)) : undefined
    const saved = savedIn(pick('meta'), scope)
    return (): CachedScope => ({
      meta: { ...emptyMeta(), ...(meta.result as Meta | undefined) },
      summaries: summaries.result as SummaryRecord[],
      asked: tail && entries ? threadOf(tail.result as TailRecord | undefined, entries.result as Entry[]) : undefined,
      saved: saved(),
    })
  })

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
