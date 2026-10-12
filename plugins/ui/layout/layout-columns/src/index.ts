import { cssOrder, dismissible, owned } from '@sand/kit/web'
import type { Layout, LayoutState, Region } from '@sand/protocol'
import { batch, byId, derive, effect, media, mount, setStyle, sig, store, untrack, type Sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { layoutMemory } from './memory'
import { savedWidths } from './resize'
import { buildShell, type Coverable, type Open, type Views } from './shell'
import type { Shift } from './slide'
import { swiper } from './swipe'

const narrowQuery = '(max-width: 760px)'
const closed: Open = { side: false, aside: false }
const drawers = ['side', 'aside'] as const

const has = (views: Sig<HTMLElement[]>) => views.get().length > 0

export default definePlugin({
  name: 'layout-columns',
  description: 'Top strip, side column, main column, aside column and bottom strip; side and aside become drawers on narrow screens',
  inject: ['kit'],
  uses: { commands: 'no /panel command' },
  apply(ctx) {
    const { remembered, remember } = layoutMemory()
    const narrow = owned(ctx, () => media(narrowQuery))
    const open = store<Open>(narrow.get() ? closed : remembered())
    const current = (): Open => ({ side: open.side.get(), aside: open.aside.get() })
    const adopt = (next: Open) => {
      open.side.set(next.side)
      open.aside.set(next.aside)
    }
    const shift = sig<Shift | undefined>(undefined)
    const swiped = sig(false)
    const reset = (next: Open) =>
      batch(() => {
        adopt(next)
        shift.set(undefined)
        swiped.set(false)
      })

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
    const state = (): LayoutState => ({ narrow: narrow.get(), open: current(), filled: { ...filled.get() } })
    const changed = () => ctx.emit('layout.change', state())

    const add = (into: Sig<HTMLElement[]>, view: HTMLElement) => {
      into.update(list => [...list, view])
      changed()
      return () => {
        into.update(list => list.filter(other => other !== view))
        changed()
      }
    }

    const widths = savedWidths()
    const root = owned(ctx, () => buildShell(ctx.kit, { narrow, open, views, covers, filled, covered, shift, swiped, widths }, () => layout.toggle('side', false)))

    const layout: Layout = {
      mount(region, view, order = 0) {
        setStyle(view, { order: cssOrder(order) })
        return add(views[region], view)
      },
      cover(region, view) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        return add(covers[region], view)
      },
      toggle(region, value) {
        const next = { ...current(), [region]: value ?? !open[region].get() }
        if (narrow.get() && next[region]) next[region === 'side' ? 'aside' : 'side'] = false
        if (!narrow.get()) remember(next)
        reset(next)
        changed()
      },
      state,
      swipe: () => (narrow.get() ? beginSwipe() : undefined),
    }
    const beginSwipe = swiper({
      open,
      shift,
      swiped,
      owner: root,
      commit: next => {
        adopt(next)
        changed()
      },
    })

    owned(ctx, () =>
      effect(() => {
        const matches = narrow.get()
        untrack(() => {
          reset(matches ? closed : remembered())
          changed()
        })
      }),
    )
    owned(ctx, () => {
      const drawer = derive(() => (narrow.get() ? drawers.find(region => open[region].get()) : undefined))
      effect(() => {
        const region = drawer.get()
        if (region) return dismissible(root, () => layout.toggle(region, false), { overlay: false })
      })
    })
    ctx.effect(() => mount(byId('stage'), root))
    ctx.provide('layout', layout)
    ctx.watch('commands', commands => commands?.add({ name: 'panel', description: 'Toggle the right panel', run: () => layout.toggle('aside') }))
  },
})
