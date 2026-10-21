import { layout, layoutChange, type Layout } from '@sand/layout/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export interface Surface {
  floating: () => boolean
  covering: () => boolean
  drawerOpen: () => boolean
  open(): boolean
  setOpen(open: boolean): void
}

export const createSurface = (ctx: Context, changed: () => void): Surface => {
  let shell: Layout | undefined
  const floating = sig(true)
  const narrow = sig(false)
  const drawerOpen = sig(false)

  ctx.watch(layout, next => {
    shell = next
    floating.set(!next)
    narrow.set(Boolean(next?.state().narrow))
    return () => {
      shell = undefined
    }
  })
  ctx.on(layoutChange, state => {
    narrow.set(state.narrow)
    changed()
  })

  return {
    floating: () => floating.get(),
    covering: () => floating.get() || narrow.get(),
    drawerOpen: () => drawerOpen.get(),
    open: () => (shell ? shell.state().open.aside : drawerOpen.get()),
    setOpen(value) {
      if (shell) shell.toggle('aside', value)
      else {
        drawerOpen.set(value)
        changed()
      }
    },
  }
}
