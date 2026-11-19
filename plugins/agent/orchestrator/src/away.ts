import { peers } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import type { OrchestratorContext } from './context'
import { type Finish, failureOf, threadReported, threadRemove, threadReports, threadStop, threadUpdate } from './contract'
import type { Pcs } from './pcs'

type Errand = 'stop' | 'archive' | 'remove'

export interface Away {
  thread: string
  pc: string
  errand: Errand
}

export type SendAway = (away: Away) => Promise<boolean>

const unavailable = (error: unknown) => failureOf(error).code === 'unavailable'

export const createAway = (ctx: OrchestratorContext, pcs: Pcs, tell: (finish: Finish) => Promise<void>): SendAway => {
  const { db } = ctx.ledger
  const owedOn = db.query<{ thread: string; errand: Errand }, { pc: string }>('select thread, action as errand from thread_owed where pc = $pc')
  const owing = {
    stop: db.query("insert or ignore into thread_owed (thread, pc, action) values ($thread, $pc, 'stop')"),
    archive: db.query("insert or replace into thread_owed (thread, pc, action) values ($thread, $pc, 'archive')"),
    remove: db.query("insert or replace into thread_owed (thread, pc, action) values ($thread, $pc, 'remove')"),
  }
  const settled = db.query('delete from thread_owed where thread = $thread')
  const queues = new Map<string, Promise<unknown>>()

  const run = async ({ thread, pc, errand }: Away) => {
    switch (errand) {
      case 'stop':
        return pcs.call(pc, threadStop, { session: thread })
      case 'archive':
        return Boolean(await pcs.call(pc, threadUpdate, { session: thread, archived: true }))
      case 'remove':
        return pcs.call(pc, threadRemove, { session: thread })
    }
  }

  const owe = ({ thread, pc, errand }: Away, error: unknown) => {
    if (!unavailable(error)) throw error
    owing[errand].run({ thread, pc })
    return true
  }

  const settle = async (away: Away) => {
    await run(away).catch(error => {
      if (unavailable(error)) throw error
      ctx.report(error)
    })
    settled.run({ thread: away.thread })
  }

  const collect = async (pc: string, delivered: string[] = []): Promise<void> => {
    const owed = await pcs.call(pc, threadReports, { delivered })
    if (!owed.length) return
    for (const finish of owed) await tell(finish)
    return collect(pc, owed.map(finish => finish.clientRequestId))
  }

  const catchUp = async (pc: string) => {
    for (const row of owedOn.all({ pc })) await settle({ ...row, pc })
    await collect(pc)
  }

  const queue = (pc: string) => {
    const next = (queues.get(pc) ?? Promise.resolve()).then(() => catchUp(pc)).catch(error => unavailable(error) || ctx.report(error))
    queues.set(pc, next)
  }

  ctx.watch(peers, found => {
    if (!found) return
    for (const pc of found.connected()) queue(pc)
    return joinDisposers(
      found.onOpen(queue),
      found.on(threadReported, (_, pc) => queue(pc)),
    )
  })

  return away => run(away).catch(error => owe(away, error))
}
