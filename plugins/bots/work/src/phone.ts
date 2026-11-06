import { layout, type Layout } from '@sand/layout/contract'
import { addressLayer, leaveLayer, onAddressChange, pushLayer } from '@sand/web-client/contract'
import { collectScope, derive, disposeAll, div, dynamicChild, effect, portal, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import { tabBody, tabSwitch, type Tab, type WorkParts } from './tabs'
import { threadView } from './thread/view'

type Shown = { kind: 'sheet'; from: HTMLElement } | { kind: 'thread'; id: string }

const workLayer = 'bot-work'

const holdLayer = (close: () => void) => {
  pushLayer(workLayer)
  const stop = onAddressChange(() => {
    if (addressLayer() !== workLayer) close()
  })
  return () => {
    stop()
    if (addressLayer() === workLayer) leaveLayer()
  }
}

const cover = (ctx: WorkContext, found: Layout, thread: string, backLabel: string, close: () => void) => {
  const view = collectScope(() => threadView(ctx, thread, { back: close, backLabel }))
  const uncover = found.cover('main', view.value)
  return () => {
    uncover()
    disposeAll(view.scope)
  }
}

const sheet = (ctx: WorkContext, parts: WorkParts, tab: Sig<Tab>, from: HTMLElement, close: () => void, open: (thread: string) => void) =>
  ctx.kit.bottomSheet(
    { close, from, role: 'dialog', 'aria-label': 'Bot work', class: 'flex max-h-full flex-col' },
    div({ class: 'flex shrink-0 px-2 pb-2' }, tabSwitch(ctx, parts, tab)),
    div({ class: 'flex min-h-0 flex-col overflow-auto overscroll-contain pb-2' }, tabBody(ctx, parts, tab, open)),
  )

export const phoneWork = (ctx: WorkContext, parts: WorkParts, backLabel: () => string) => {
  const shown = sig<Shown | undefined>(undefined)
  const tab = sig<Tab>('work')
  const close = () => shown.set(undefined)
  const open = (id: string) => shown.set({ kind: 'thread', id })
  const layered = derive(() => shown.get() !== undefined)
  const listedFrom = derive(() => {
    const current = shown.get()
    return current?.kind === 'sheet' ? current.from : undefined
  })
  const thread = derive(() => {
    const current = shown.get()
    return current?.kind === 'thread' ? current.id : undefined
  })

  effect(() => {
    if (!layered.get()) return
    return untrack(() => holdLayer(close))
  })
  effect(() => {
    const id = thread.get()
    const found = ctx.get(layout)
    if (!id || !found) return
    return untrack(() => cover(ctx, found, id, backLabel(), close))
  })

  return {
    list: (from: HTMLElement) => shown.set({ kind: 'sheet', from }),
    view: () => dynamicChild(listedFrom, from => (from ? portal(document.body, sheet(ctx, parts, tab, from, close, open)) : null)),
  }
}
