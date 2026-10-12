import type { PairInvite } from '@sand/host-devices/contract'
import { effect, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { renewBeforeExpiry } from '../renew'

export const pairInvite = (ctx: Context<'wire'>, epoch: Sig<number>, shown: Set<number>) => {
  const invite = sig<PairInvite | undefined>(undefined)
  const error = sig<unknown>(undefined)
  const renew = sig(0)
  effect(() => {
    epoch.get()
    renew.get()
    let current = true
    untrack(() =>
      ctx.wire.call<PairInvite>({ type: 'pair.create' }).then(
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
