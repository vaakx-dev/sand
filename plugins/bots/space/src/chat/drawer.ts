import type { BotChatPart } from '@sand/bots/contract'
import { layout, type Slot } from '@sand/layout/contract'
import { collectScope, disposeAll, div, effect, untrack, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'

export const chatDrawer = (ctx: BotsContext, slot: Slot, parts: Sig<BotChatPart[]>, bot: Derive<string | undefined>) =>
  ctx.watch(layout, found => {
    if (!found) return
    const { scope } = collectScope(() =>
      effect(() => {
        const id = bot.get()
        const render = parts.get().flatMap(part => (part.drawer ? [part.drawer] : []))
        if (!id || !render.length) return
        untrack(() => {
          const drawers = render.map(drawer => drawer(id))
          const view = div({ class: 'flex min-h-0 flex-1 flex-col' }, ...drawers.map(drawer => drawer.view))
          effect(() => {
            if (drawers.some(drawer => drawer.shown())) return untrack(() => found.mount(slot, view))
          })
        })
      }),
    )
    return () => disposeAll(scope)
  })
