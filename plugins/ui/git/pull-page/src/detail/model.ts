import { type PullRef, type PullSummary, samePull } from '@sand/github/contract'
import type { PullDetail } from '@sand/pull-detail/contract'
import { errorMessage } from '@sand/util'
import { effect, onTimeout, sig } from '@vaakx-dev/vrui'
import { hereOf, type PageContext } from '../inject'

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
        if (mine !== token) return
        if (detail.get()) return ctx.report(error)
        failure.set(errorMessage(error))
      })
  }

  const soon = () => {
    pending?.()
    pending = onTimeout(() => load(), settleFor)
  }

  const put = (next: PullDetail | PullSummary | undefined) => {
    if (!next || !samePull(next, ref)) return
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
      if (samePull(changedRef, ref)) soon()
    }),
  )
  effect(() =>
    ctx.github.onPullChange((summary, device) => {
      if (device !== hereOf(ctx) || !samePull(summary, ref)) return
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
