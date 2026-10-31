import type { PullRef } from '@sand/github/contract'
import { type Layout, layout } from '@sand/layout/contract'
import { running } from '@sand/layout/place'
import { onAddressChange } from '@sand/web-client/address'
import { threadSelect } from '@sand/web-client/contract'
import { collectScope, disposeAll, effect, sig, untrack } from '@vaakx-dev/vrui'
import { leaveQuery, openQuery, recordQuery, requestedQuery } from '../address/query'
import type { QueryState } from '../address/state'
import type { PageContext } from '../inject'
import { pullKey } from '../pull/ref'

export const pageHost = (ctx: PageContext, query: QueryState, build: () => HTMLElement) => {
  const open = sig(false)
  let shell: Layout | undefined
  let uncover: (() => void) | undefined

  const hide = () => {
    open.set(false)
    uncover?.()
    uncover = undefined
  }

  const render = () => {
    if (uncover || !shell || !running(ctx)) return
    const page = collectScope(build)
    const stop = shell.cover('main', page.value)
    uncover = () => {
      void stop()
      disposeAll(page.scope)
    }
    open.set(true)
  }

  const sync = () => {
    const wanted = requestedQuery()
    if (!wanted) return hide()
    query.load(wanted)
    render()
  }

  const show = (pull?: PullRef) => {
    if (open.get()) return query.pull.set(pull && pullKey(pull))
    openQuery({ ...query.current(), pull: pull && pullKey(pull) })
    sync()
  }

  const close = () => {
    if (!open.get()) return
    hide()
    leaveQuery()
  }

  ctx.on(threadSelect, sync)
  ctx.effect(() => onAddressChange(sync))
  ctx.effect(() =>
    effect(() => {
      const current = query.current()
      if (open.get()) untrack(() => recordQuery(current))
    }),
  )
  ctx.watch(layout, found => {
    if (!found) return
    shell = found
    sync()
    return () => {
      hide()
      shell = undefined
    }
  })

  return { open, show, close, toggle: () => (open.get() ? close() : show()) }
}
