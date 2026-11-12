import { isPcUnavailable, peers, type Peers } from '@sand/devices-contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { type Exchanged, logbookExchange, logbookPut, type Revision, type Versions } from './contract'
import type { Store } from './store'

interface SyncOptions {
  store: Store
  taken(ids: string[]): void
}

const newerIn = (versions: Versions, than: Versions) =>
  Object.entries(versions)
    .filter(([id, updated]) => updated > (than[id] ?? -1))
    .map(([id]) => id)

const exchanged = (store: Store, theirs: Versions): Exchanged => {
  const ours = store.versions()
  return { revisions: store.revisions(newerIn(ours, theirs)), wanted: newerIn(theirs, ours) }
}

const syncAcrossPcs = (ctx: Context, { store, taken }: SyncOptions) => {
  const take = (revisions: Revision[]) => {
    const ids = store.take(revisions)
    if (ids.length) taken(ids)
  }

  const reportFailure = (error: unknown) => {
    if (!isPcUnavailable(error)) ctx.report(error)
  }

  const exchange = async (linked: Peers, pc: string) => {
    const { revisions, wanted } = await linked.call(pc, logbookExchange, { versions: store.versions() })
    take(revisions)
    if (wanted.length) await linked.call(pc, logbookPut, { revisions: store.revisions(wanted) })
  }

  const round = (linked: Peers, pc: string) => exchange(linked, pc).catch(reportFailure)

  const push = async (revision: Revision) => {
    const linked = ctx.get(peers)
    if (!linked) return
    const outcomes = await linked.callEach(logbookPut, { revisions: [revision] })
    for (const outcome of outcomes) if (!outcome.ok) reportFailure(outcome.error)
  }

  const serve = (server: Server) =>
    joinDisposers(
      server.handle(logbookExchange, ({ versions }) => exchanged(store, versions)),
      server.handle(logbookPut, ({ revisions }) => take(revisions)),
    )

  ctx.watch(peers, linked => {
    if (!linked) return
    for (const pc of linked.connected()) void round(linked, pc)
    return linked.onOpen(pc => void round(linked, pc))
  })

  return { push: (revision: Revision) => void push(revision).catch(error => ctx.report(error)), serve }
}

export { syncAcrossPcs }
