import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { onAddressChange } from '@sand/web-client/contract'
import { byId, derive, effect, media, mount, setStyle, sig, store, untrack, type Sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { cssOrder, layout, layoutChange, spaces, type Layout, type LayoutState, type Region, type SpaceRegion, type Strip } from './contract'
import { layoutMemory } from './memory'
import { phoneNavigation, type Drawer } from './phone'
import { savedWidths } from './resize'
import { buildShell, type Coverable, type Open, type Shelves, type Views } from './shell'
import { spaceBoard } from './spaces'
import { keyboardArea, keyboardShown } from './viewport'

const narrowQuery = '(max-width: 760px)'

const has = (views: Sig<HTMLElement[]>) => views.get().length > 0

const blurFocus = () => {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}

export default definePlugin({
  name: 'layout',
  description: 'Spaces and the regions they fill: rail, top strip, side, main and aside columns and bottom strip; on narrow screens side and aside become drawers and the rail a bottom bar',
  inject: { kit },
  apply(ctx) {
    const { remembered, remember } = layoutMemory()
    const narrow = owned(ctx, () => media(narrowQuery))
    const open = store<Open>(remembered())
    const columns = (): Open => ({ side: open.side.get(), aside: open.aside.get() })

    const board = spaceBoard(ctx)
    const strips: Views<Strip> = { top: sig([]), rail: sig([]), bottom: sig([]), overlay: sig([]) }
    const shelves: Shelves = { side: sig([]), main: sig([]), aside: sig([]) }
    const covers: Views<Coverable> = { side: sig([]), main: sig([]) }
    const shows = (region: SpaceRegion) => shelves[region].get().some(entry => entry.space === board.active())
    const { covered, filled } = owned(ctx, () => ({
      covered: derive(() => ({ side: has(covers.side), main: has(covers.main) })),
      filled: derive(
        (): Record<Region, boolean> => ({
          top: has(strips.top),
          rail: has(strips.rail),
          side: shows('side') || has(covers.side),
          main: shows('main') || has(covers.main),
          aside: shows('aside'),
          bottom: has(strips.bottom),
          overlay: has(strips.overlay),
        }),
      ),
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

    const add = <T>(into: Sig<T[]>, item: T) => {
      into.update(list => [...list, item])
      changed()
      return () => {
        into.update(list => list.filter(other => other !== item))
        changed()
      }
    }

    const widths = savedWidths()
    const keyboard = owned(ctx, keyboardArea)
    const typing = owned(ctx, () => keyboardShown(keyboard))
    const root = owned(ctx, () =>
      buildShell(
        ctx.kit,
        { narrow, open, strips, shelves, active: board.active, covers, filled, covered, phone: phone.state, keyboard, typing, widths },
        () => host.toggle('side', false),
      ),
    )

    const host: Layout = {
      mount(target, view, order = 0) {
        setStyle(view, { order: cssOrder(order) })
        if (typeof target === 'string') return add(strips[target], view)
        return add(shelves[target.region], { space: target.space, view })
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
    owned(ctx, () =>
      effect(() => {
        board.active()
        untrack(changed)
      }),
    )
    ctx.effect(() => mount(byId('stage'), root))
    ctx.provide(layout, host)
    ctx.provide(spaces, board)
  },
})
