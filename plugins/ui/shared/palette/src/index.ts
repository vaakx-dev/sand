import { keys } from '@sand/keys/contract'
import { floating } from '@sand/layout/place'
import { nav } from '@sand/nav/contract'
import { kit } from '@sand/ui-kit/contract'
import { show, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { palette, type Palette, type PalettePage, type PaletteSource } from './contract'
import { merged, rootPage } from './root'
import { paletteSheet } from './sheet/sheet'

export default definePlugin({
  name: 'palette',
  description: 'Command palette (mod+k): threads, projects, models and other actions, with pages you step through and go back from',
  inject: { kit },
  apply(ctx) {
    const sources = new Set<PaletteSource>()
    const root = rootPage(() => [...sources])
    const stack = sig<PalettePage[]>([])
    let query = ''

    const host: Palette = {
      open(start = '') {
        query = typeof start === 'string' ? start : ''
        stack.set([typeof start === 'string' ? root : start])
      },
      close: () => stack.set([]),
      source(source) {
        sources.add(source)
        return () => void sources.delete(source)
      },
      items: (page, typed) => merged([...sources].filter(source => source.page === page), typed),
    }

    const isOpen = stack.map(pages => pages.length > 0)
    floating(ctx, () => show(isOpen, () => paletteSheet(ctx, stack, () => query)))
    const toggle = () => (isOpen.get() ? host.close() : host.open())
    ctx.provide(palette, host)
    ctx.watch(keys, found => found?.bind({ key: 'mod+k', global: true, run: toggle }))
    ctx.watch(nav, found => found?.action({ id: 'search', label: 'Search', icon: 'search', order: 0, wide: true, run: () => host.open() }))
  },
})
