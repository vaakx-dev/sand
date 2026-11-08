import { keys } from '@sand/keys/contract'
import { floating, owned } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { effect, show, sig, untrack } from '@vaakx-dev/vrui'
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
    owned(ctx, () =>
      effect(() => {
        if (isOpen.get()) return untrack(() => ctx.get(shell)?.cover(host.close))
      }),
    )
    const toggle = () => (isOpen.get() ? host.close() : host.open())
    ctx.provide(palette, host)
    ctx.watch(keys, found => found?.bind({ key: 'mod+k', global: true, passthrough: true, run: toggle }))
    ctx.watch(shell, found => found?.nav({ id: 'search', label: 'Search', icon: 'search', order: 0, run: () => host.open() }))
  },
})
