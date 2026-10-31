import type { ChangesPanel } from '@sand/git-changes/contract'
import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { sig } from '@vaakx-dev/vrui'
import type { TurnsContext } from './inject'
import { snapshotStore } from './snapshots/store'

export const turnParts = (ctx: TurnsContext) => {
  const current = sig(ctx.threads.current()?.id)
  const follow = () => current.set(ctx.threads.current()?.id)
  ctx.on(threadSelect, follow)
  ctx.on(threadsChange, follow)
  return {
    ctx,
    store: snapshotStore(ctx),
    current,
    panel: sig<ChangesPanel | undefined>(undefined),
    threads: pulse(ctx, [threadsChange, threadChange]),
  }
}

export type TurnParts = ReturnType<typeof turnParts>
