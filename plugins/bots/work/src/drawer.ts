import type { BotChatDrawer } from '@sand/bots/contract'
import { layout, type Layout } from '@sand/layout/contract'
import { joinDisposers } from '@sand/util'
import { addressLayer, leaveLayer, onAddressChange, pushLayer } from '@sand/web-client/contract'
import { collectScope, disposeAll, effect, scoped, sig, untrack } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import { listPane } from './panel'
import { hasWork, type Tab, type WorkParts } from './tabs'
import { threadView } from './thread/view'

export interface DrawerParts extends WorkParts {
  name: () => string
}

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

export const workDrawer = (ctx: WorkContext, parts: DrawerParts): BotChatDrawer => {
  const tab = sig<Tab>('work')
  const opened = sig<string | undefined>(undefined)
  const close = () => opened.set(undefined)
  const open = (thread: string) => {
    ctx.get(layout)?.handOff()
    opened.set(thread)
  }

  scoped(parts.plan.listen())
  effect(() => {
    const thread = opened.get()
    const found = ctx.get(layout)
    if (!thread || !found) return
    return untrack(() => joinDisposers(holdLayer(close), cover(ctx, found, thread, parts.name(), close)))
  })

  const hide = ctx.kit.closeButton({ title: 'Hide the panel', onClick: () => ctx.get(layout)?.toggle('aside', false) })
  return { view: listPane(ctx, parts, tab, open, 'min-h-0 flex-1', hide), shown: () => hasWork(parts) }
}
