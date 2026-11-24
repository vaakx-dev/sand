import { changesLive, type ChangesLive, type ChangeState, type ThreadChanges } from '@sand/changes/contract'
import type { Status } from '@sand/ui-shell/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type Changes = ReturnType<typeof changesModel>

const statuses: Partial<Record<ChangeState, Status>> = { ready: 'ready', merging: 'merging', conflict: 'waiting', failed: 'waiting' }

export const changeStatus = (change: ThreadChanges | undefined) => change && statuses[change.state]

export const changesModel = (ctx: Context) => {
  const live = sig<ChangesLive | undefined>(undefined)
  ctx.watch(changesLive, found => live.set(found))
  return {
    get: (thread: string) => live.get()?.get(thread),
  }
}
