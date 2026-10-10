import type { Layout } from '@sand/layout-columns/contract'
import { place, sig } from '@sand/dom'
import type { Context, Dispose } from 'drydock'

export interface Surface {
  floating: () => boolean
  drawerOpen: () => boolean
  sync(filled: boolean): void
  open(): boolean
  setOpen(open: boolean): void
}

export const createSurface = (ctx: Context, build: () => HTMLElement, changed: () => void): Surface => {
  let layout: Layout | undefined
  let unplace: Dispose | undefined
  const floating = sig(true)
  const drawerOpen = sig(false)

  const sync = (filled: boolean) => {
    if (filled && !unplace) unplace = place(ctx, 'aside', build)
    if (filled || !unplace) return
    void unplace()
    unplace = undefined
  }

  ctx.watch('layout', next => {
    layout = next
    floating.set(!next)
    return () => {
      layout = undefined
    }
  })
  ctx.on('layout.change', () => changed())

  return {
    floating: () => floating.get(),
    drawerOpen: () => drawerOpen.get(),
    sync,
    open: () => (layout ? layout.state().open.aside : drawerOpen.get()),
    setOpen(value) {
      if (layout) layout.toggle('aside', value)
      else {
        drawerOpen.set(value)
        changed()
      }
    },
  }
}
