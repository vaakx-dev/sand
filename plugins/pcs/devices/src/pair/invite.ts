import type { PairInvite } from '@sand/host-devices/contract'
import { pairCreate } from '@sand/host-gateway/contract'
import { effect, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { WireContext } from '../inject'
import { renewBeforeExpiry } from '../renew'

export const pairInvite = (ctx: WireContext, epoch: Sig<number>, shown: Set<number>) => {
  const invite = sig<PairInvite | undefined>(undefined)
  const error = sig<unknown>(undefined)
  const renew = sig(0)
  effect(() => {
    epoch.get()
    renew.get()
    let current = true
    untrack(() =>
      ctx.wire.call(pairCreate, {}).then(
        next => {
          if (!current) return
          shown.add(next.expires)
          invite.set(next)
        },
        failure => {
          if (current) error.set(failure)
        },
      ),
    )
    return () => {
      current = false
    }
  })
  effect(() => {
    const active = invite.get()
    if (active) renewBeforeExpiry(active.expires, renew)
  })
  return { invite, error }
}
