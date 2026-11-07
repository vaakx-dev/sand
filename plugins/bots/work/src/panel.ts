import { div, dynamicChild, show, sig, type Child, type Sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import { hasWork, tabBody, tabSwitch, type Tab, type WorkParts } from './tabs'
import { threadView } from './thread/view'

const openWidth = { width: 'clamp(380px, 45vw, 640px)' }

export const listPane = (ctx: WorkContext, parts: WorkParts, tab: Sig<Tab>, open: (thread: string) => void, look: string, ...end: Child[]) =>
  div(
    { class: ['flex flex-col', look] },
    ctx.kit.paneHead({}, div({ class: 'flex min-w-0 flex-1' }, tabSwitch(ctx, parts, tab)), ...end),
    div({ class: 'flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain px-2 pb-4', style: ctx.kit.stableGutter }, tabBody(ctx, parts, tab, open)),
  )

const threadPane = (ctx: WorkContext, thread: string, back: () => void) =>
  div({ class: 'flex', style: openWidth }, threadView(ctx, thread, { back, backLabel: 'Work' }))

export const workPanel = (ctx: WorkContext, parts: WorkParts) => {
  const tab = sig<Tab>('work')
  const opened = sig<string | undefined>(undefined)
  const pane = (thread: string | undefined) =>
    thread ? threadPane(ctx, thread, () => opened.set(undefined)) : listPane(ctx, parts, tab, id => opened.set(id), 'w-64')
  return div(
    { class: 'flex h-full min-h-0', onMount: parts.plan.listen },
    show(
      () => hasWork(parts),
      () => div({ class: 'flex min-h-0 border-l border-neutral-800' }, dynamicChild(opened, pane)),
    ),
  )
}
