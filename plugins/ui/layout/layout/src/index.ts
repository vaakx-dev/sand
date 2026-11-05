import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { onAddressChange } from '@sand/web-client/contract'
import { byId, derive, effect, media, mount, setStyle, sig, store, untrack, type Sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { cssOrder, layout, layoutChange, type Layout, type LayoutState, type Region } from './contract'
import { layoutMemory } from './memory'
import { phoneNavigation, type Drawer } from './phone'
import { savedWidths } from './resize'
import { buildShell, type Coverable, type Open, type Views } from './shell'
import { keyboardArea } from './viewport'

const narrowQuery = '(max-width: 760px)'

const has = (views: Sig<HTMLElement[]>) => views.get().length > 0

const blurFocus = () => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}

export default definePlugin({
  name: 'layout',
  description: 'Top strip, side column, main column, aside column and bottom strip; side and aside become drawers on narrow screens',
  inject: { kit },
  apply(ctx) {
    const { remembered, remember } = layoutMemory()
    const narrow = owned(ctx, () => media(narrowQuery))
    const open = store<Open>(remembered())
    const columns = (): Open => ({ side: open.side.get(), aside: open.aside.get() })

    const views: Views<Region> = { top: sig([]), side: sig([]), main: sig([]), aside: sig([]), bottom: sig([]), overlay: sig([]) }
    const covers: Views<Coverable> = { side: sig([]), main: sig([]) }
    const { covered, filled } = owned(ctx, () => ({
      covered: derive(() => ({ side: has(covers.side), main: has(covers.main) })),
      filled: derive(() => ({
        top: has(views.top),
        side: has(views.side) || has(covers.side),
        main: has(views.main) || has(covers.main),
        aside: has(views.aside),
        bottom: has(views.bottom),
        overlay: has(views.overlay),
      })),
    }))
    const available = (drawer: Drawer) => filled.get()[drawer] && !(drawer === 'aside' && covered.get().main)
    const phone = phoneNavigation(available, () => root, () => changed())
    const current = (): Open => {
      if (!narrow.get()) return columns()
      const pane = phone.pane()
      return { side: pane === 'side', aside: pane === 'aside' }
    }
    const state = (): LayoutState => ({ narrow: narrow.get(), open: current(), filled: { ...filled.get() } })
    const changed = () => ctx.emit(layoutChange, state())

    const add = (into: Sig<HTMLElement[]>, view: HTMLElement) => {
      into.update(list => [...list, view])
      changed()
      return () => {
        into.update(list => list.filter(other => other !== view))
        changed()
      }
    }

    const widths = savedWidths()
    const keyboard = owned(ctx, keyboardArea)
    const root = owned(ctx, () =>
      buildShell(ctx.kit, { narrow, open, views, covers, filled, covered, phone: phone.state, keyboard, widths }, () => host.toggle('side', false)),
    )

    const host: Layout = {
      mount(region, view, order = 0) {
        setStyle(view, { order: cssOrder(order) })
        return add(views[region], view)
      },
      cover(region, view) {
        blurFocus()
        return add(covers[region], view)
      },
      toggle(region, value) {
        if (!narrow.get()) {
          open[region].set(value ?? !open[region].get())
          remember(columns())
          changed()
          return
        }
        const shown = phone.pane() === region
        if (value ?? !shown) phone.show(region)
        else if (shown) phone.show('thread')
      },
      handOff() {
        if (narrow.get()) phone.handOff()
      },
      state,
      swipe: () => (narrow.get() ? phone.swipe() : undefined),
    }

    owned(ctx, () =>
      effect(() => {
        const matches = narrow.get()
        untrack(() => {
          if (matches) phone.follow()
          changed()
        })
      }),
    )
    ctx.effect(() =>
      onAddressChange(() => {
        if (narrow.get()) phone.follow()
      }),
    )
    owned(ctx, () => {
      const drawer = derive(() => {
        const pane = phone.pane()
        return narrow.get() && pane !== 'thread' ? pane : undefined
      })
      effect(() => {
        if (!drawer.get()) return
        untrack(blurFocus)
        return ctx.kit.dismissible(root, () => phone.show('thread'), { overlay: false })
      })
    })
    ctx.effect(() => mount(byId('stage'), root))
    ctx.provide(layout, host)
  },
})
