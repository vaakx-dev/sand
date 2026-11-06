import { type PullRef, pullLabel } from '@sand/github/contract'
import { place, spaces, type Spaces } from '@sand/layout/contract'
import { onAddressChange } from '@sand/web-client/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import { forgetQuery, recordQuery, requestedQuery } from '../address/query'
import type { QueryState } from '../address/state'
import type { PageContext } from '../inject'

export const pullsSpace = 'pulls'

export const pageHost = (ctx: PageContext, query: QueryState, build: () => HTMLElement) => {
  const sync = () => {
    const wanted = requestedQuery()
    if (wanted) query.load(wanted)
  }

  const shown = (found: Spaces) =>
    effect(() => {
      if (found.active() !== pullsSpace) return
      untrack(sync)
      const record = effect(() => {
        const current = query.current()
        untrack(() => recordQuery(current))
      })
      const unplace = untrack(() => place(ctx, { space: pullsSpace, region: 'main' }, build))
      return () => {
        record()
        void unplace()
        forgetQuery()
      }
    })

  const show = (pull?: PullRef) => {
    ctx.get(spaces)?.open(pullsSpace)
    query.pull.set(pull && pullLabel(pull))
  }

  ctx.effect(() => onAddressChange(sync))
  ctx.watch(spaces, found => (found ? shown(found) : undefined))

  return { show }
}
