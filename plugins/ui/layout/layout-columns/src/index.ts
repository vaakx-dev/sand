import type { Layout, LayoutState, Region } from '@sand/protocol'
import { batch, cssOrder, effect, media, mount, owned, setStyle, sig, stage, store, style, untrack } from '@sand/dom'
import { definePlugin } from 'drydock'
import { layoutMemory } from './memory'
import { gripCss, savedWidths } from './resize'
import { buildShell, regions, type Coverable, type Open } from './shell'
import type { Shift } from './slide'
import { swiper } from './swipe'

const narrowQuery = '(max-width: 760px)'
const closed: Open = { side: false, aside: false }

export default definePlugin({
  name: 'layout-columns',
  description: 'Top strip, side column, main column, aside column and bottom strip; side and aside become drawers on narrow screens',
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
    const filled = sig(Object.fromEntries(regions.map(region => [region, false])) as Record<Region, boolean>)
    const covered = sig<Record<Coverable, boolean>>({ side: false, main: false })
    const widths = savedWidths()
    style(ctx, gripCss)
    const { root, areas, covers } = owned(ctx, () => buildShell({ narrow, open, filled, covered, shift, swiped, widths }, () => layout.toggle('side', false)))

    const coverCount = (region: Region) => (region === 'side' || region === 'main' ? covers[region].childElementCount : 0)
    const state = (): LayoutState => ({ narrow: narrow.get(), open: current(), filled: { ...filled.get() } })

    const sync = () => {
      covered.set({ side: covers.side.childElementCount > 0, main: covers.main.childElementCount > 0 })
      filled.set(Object.fromEntries(regions.map(region => [region, areas[region].childElementCount + coverCount(region) > 0])) as Record<Region, boolean>)
      ctx.emit('layout.change', state())
    }

    const layout: Layout = {
      mount(region, view, order = 0) {
        setStyle(view, { order: cssOrder(order) })
        areas[region].append(view)
        sync()
        return () => {
          view.remove()
          sync()
        }
      },
      cover(region, view) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        covers[region].append(view)
        sync()
        return () => {
          view.remove()
          sync()
        }
      },
      toggle(region, value) {
        const next = { ...current(), [region]: value ?? !open[region].get() }
        if (narrow.get() && next[region]) next[region === 'side' ? 'aside' : 'side'] = false
        if (!narrow.get()) remember(next)
        reset(next)
        sync()
      },
      state,
      swipe: () => (narrow.get() ? beginSwipe() : undefined),
    }
    const beginSwipe = swiper({
      open,
      shift,
      swiped,
      commit: next => {
        adopt(next)
        sync()
      },
    })

    owned(ctx, () =>
      effect(() => {
        const matches = narrow.get()
        untrack(() => {
          reset(matches ? closed : remembered())
          sync()
        })
      }),
    )
    ctx.effect(() => mount(stage(), root))
    ctx.provide('layout', layout)
    ctx.on('thread.select', () => {
      if (narrow.get() && open.side.get()) layout.toggle('side', false)
    })
    ctx.watch('commands', commands => commands?.add({ name: 'panel', description: 'Toggle the right panel', run: () => layout.toggle('aside') }))
  },
})
