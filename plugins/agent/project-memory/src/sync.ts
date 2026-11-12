import { isPcUnavailable, peers, type Peers } from '@sand/devices-contract'
import { memoryStore } from '@sand/memory/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { projectMemoryExchange, projectMemoryPut, projectMemorySpace, type Revision } from './contract'
import type { Replica } from './replica'

const ROUND_MS = 120_000

const syncAcrossPcs = (ctx: Context, replica: Replica) => {
  const exchange = async (linked: Peers, pc: string) => {
    const { revisions, wanted } = await linked.call(pc, projectMemoryExchange, { versions: await replica.versions() })
    await replica.take(revisions)
    if (wanted.length) await linked.call(pc, projectMemoryPut, { revisions: await replica.revisions(wanted) })
  }

  const round = (linked: Peers, pc: string) =>
    exchange(linked, pc).catch(error => {
      if (!isPcUnavailable(error)) ctx.report(error)
    })

  const roundAll = (linked: Peers) => Promise.all(linked.connected().map(pc => round(linked, pc)))

  const push = async (revisions: Revision[]) => {
    const linked = ctx.get(peers)
    if (linked && revisions.length) await linked.callEach(projectMemoryPut, { revisions })
  }

  ctx.on(memoryStore, ({ space, id }) => {
    if (space === projectMemorySpace) void replica.edits(id, Date.now()).then(push, error => ctx.report(error))
  })
  ctx.watch(server, found =>
    found
      ? joinDisposers(
          found.handle(projectMemoryExchange, ({ versions }) => replica.exchange(versions)),
          found.handle(projectMemoryPut, ({ revisions }) => replica.take(revisions)),
        )
      : undefined,
  )
  ctx.watch(peers, linked => {
    if (!linked) return
    void roundAll(linked)
    const timer = setInterval(() => void roundAll(linked), ROUND_MS)
    return joinDisposers(
      linked.onOpen(pc => void round(linked, pc)),
      () => clearInterval(timer),
    )
  })
}

export { syncAcrossPcs }
