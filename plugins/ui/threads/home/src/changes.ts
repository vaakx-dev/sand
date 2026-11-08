import { changesChange, changesList, changesMerge, type ChangeState, type ThreadChanges } from '@sand/changes/contract'
import { pcHello, type Pcs, type Wire } from '@sand/devices-contract'
import { featureState } from '@sand/features/contract'
import type { Status } from '@sand/ui-shell/contract'
import { joinDisposers } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type Changes = ReturnType<typeof changesModel>

const statuses: Partial<Record<ChangeState, Status>> = { ready: 'ready', merging: 'merging', conflict: 'waiting', failed: 'waiting' }

export const changeStatus = (change: ThreadChanges | undefined) => change && statuses[change.state]

export const mergeTrouble = (change: ThreadChanges | undefined) =>
  change?.state === 'conflict' || change?.state === 'failed' ? (change.reason ?? "Couldn't merge") : undefined

export const changesModel = (ctx: Context, wire: Wire, pcs: Pcs) => {
  const byThread = sig<ReadonlyMap<string, ThreadChanges>>(new Map())
  const put = (list: ThreadChanges[]) =>
    byThread.update(current => {
      const next = new Map(current)
      for (const change of list) next.set(change.session, change)
      return next
    })
  const load = (pc: string) => void wire.call(changesList, {}, pc).then(put, error => ctx.report(error))

  const follow = () => {
    for (const pc of pcs.list()) if (wire.ready(pc.id)) load(pc.id)
    const stop = joinDisposers(
      ctx.on(pcHello, load),
      wire.on(changesChange, change => put([change]), { from: 'all' }),
    )
    return () => {
      void stop()
      byThread.set(new Map())
    }
  }

  ctx.watch(featureState, found => found && effect(() => (found.on('merge') ? untrack(follow) : undefined)))

  return {
    get: (thread: string) => byThread.get().get(thread),
    merge: (thread: Thread) => wire.call(changesMerge, { session: thread.id }, thread.device),
  }
}
