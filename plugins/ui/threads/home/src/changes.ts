import { changesLive, type ChangesLive, changesMerge, type ChangeState, type ThreadChanges } from '@sand/changes/contract'
import type { Wire } from '@sand/devices-contract'
import type { Status } from '@sand/ui-shell/contract'
import type { Thread } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type Changes = ReturnType<typeof changesModel>

const statuses: Partial<Record<ChangeState, Status>> = { ready: 'ready', merging: 'merging', conflict: 'waiting', failed: 'waiting' }

export const changeStatus = (change: ThreadChanges | undefined) => change && statuses[change.state]

export const mergeTrouble = (change: ThreadChanges | undefined) =>
  change?.state === 'conflict' || change?.state === 'failed' ? (change.reason ?? "Couldn't merge") : undefined

export const changesModel = (ctx: Context, wire: Wire) => {
  const live = sig<ChangesLive | undefined>(undefined)
  ctx.watch(changesLive, found => live.set(found))
  return {
    get: (thread: string) => live.get()?.get(thread),
    merge: (thread: Thread) => wire.call(changesMerge, { session: thread.id }, thread.device),
  }
}
