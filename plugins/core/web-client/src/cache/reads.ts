import type { Entry } from '@sand/chats/contract'
import { transact, under, type PickStore } from '../integrations/indexed-db'
import { emptyMeta, type CachedThread, type Meta, type SummaryRecord, type TailRecord } from './records'

export interface CachedScope {
  kept: boolean
  meta: Meta
  summaries: SummaryRecord[]
  asked?: CachedThread
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

export const readThreads = (scope: string, ids: string[]) =>
  transact('readonly', pick => {
    const reads = ids.map(id => [id, cachedThread(pick, scope, id)] as const)
    return () => new Map(reads.map(([id, read]) => [id, read()]))
  })

export const readScope = (scope: string, asked: string | undefined) =>
  transact('readonly', pick => {
    const meta = pick('meta').get(scope)
    const summaries = pick('threads').getAll(under(scope))
    const thread = asked ? cachedThread(pick, scope, asked) : undefined
    return (): CachedScope => ({
      kept: meta.result !== undefined,
      meta: { ...emptyMeta(), ...(meta.result as Meta | undefined) },
      summaries: summaries.result as SummaryRecord[],
      asked: thread?.(),
    })
  })
