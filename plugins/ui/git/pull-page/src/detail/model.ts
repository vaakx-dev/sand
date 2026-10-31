import type { PullRef, PullSummary } from '@sand/github/contract'
import type { PullDetail } from '@sand/pull-detail/contract'
import { errorMessage } from '@sand/util'
import { effect, onTimeout, sig } from '@vaakx-dev/vrui'
import { hereOf, type PageContext } from '../inject'
import { sameKey } from '../pull/ref'

const settleFor = 250

export const detailModel = (ctx: PageContext, ref: PullRef) => {
  const detail = sig<PullDetail | undefined>(undefined)
  const failure = sig('')
  const busy = sig(false)
  let token = 0
  let pending: (() => void) | undefined

  const load = (fresh = false) => {
    const mine = ++token
    ctx.pullDetail
      .detail({ repo: ref.repo, number: ref.number, ...(fresh && { fresh }) })
      .then(found => {
        if (mine !== token) return
        failure.set('')
        detail.set(found)
      })
      .catch(error => {
        if (mine === token && !detail.get()) failure.set(errorMessage(error))
      })
  }

  const soon = () => {
    pending?.()
    pending = onTimeout(() => load(), settleFor)
  }

  const put = (next: PullDetail | PullSummary | undefined) => {
    if (!next || !sameKey(next, ref)) return
    token++
    const known = detail.get()
    detail.set(known ? { ...known, ...next } : 'body' in next ? next : known)
    if (!('body' in next)) soon()
  }

  const run = async <T>(work: () => Promise<T>) => {
    if (busy.get()) return undefined
    busy.set(true)
    try {
      return await work()
    } finally {
      busy.set(false)
    }
  }

  effect(() =>
    ctx.pullDetail.onChange(changedRef => {
      if (sameKey(changedRef, ref)) soon()
    }),
  )
  effect(() =>
    ctx.github.onPullChange((summary, device) => {
      if (device !== hereOf(ctx) || !sameKey(summary, ref)) return
      const known = detail.get()
      if (known) detail.set({ ...known, ...summary })
      soon()
    }),
  )
  effect(() => () => pending?.())
  load()

  return { ref, detail, failure, busy, load, put, run, refresh: () => load(true) }
}

export type DetailModel = ReturnType<typeof detailModel>
