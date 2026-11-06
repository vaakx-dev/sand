import { div, dynamicChild, show, sig, type Sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import { tabBody, tabSwitch, type Tab, type WorkParts } from './tabs'
import { threadView } from './thread/view'

export interface PanelParts extends WorkParts {
  started: () => boolean
}

const openWidth = { width: 'clamp(380px, 45vw, 640px)' }

const listPane = (ctx: WorkContext, parts: WorkParts, tab: Sig<Tab>, open: (thread: string) => void) =>
  div(
    { class: 'flex w-64 flex-col' },
    ctx.kit.paneHead({}, tabSwitch(ctx, parts, tab)),
    div({ class: 'flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain px-2 pb-4', style: ctx.kit.stableGutter }, tabBody(ctx, parts, tab, open)),
  )

const threadPane = (ctx: WorkContext, thread: string, back: () => void) =>
  div({ class: 'flex', style: openWidth }, threadView(ctx, thread, { back, backLabel: 'Work' }))

export const workPanel = (ctx: WorkContext, parts: PanelParts) => {
  const tab = sig<Tab>('work')
  const opened = sig<string | undefined>(undefined)
  const pane = (thread: string | undefined) =>
    thread ? threadPane(ctx, thread, () => opened.set(undefined)) : listPane(ctx, parts, tab, id => opened.set(id))
  return div(
    { class: 'flex h-full min-h-0', onMount: parts.plan.listen },
    show(
      () => parts.started() || parts.plan.filled.get(),
      () => div({ class: 'flex min-h-0 border-l border-neutral-800' }, dynamicChild(opened, pane)),
    ),
  )
}
