import { keys } from '@sand/keys/contract'
import { owned } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { palette, type Palette, type PalettePage, type PaletteSource } from './contract'
import { merged, rootPage } from './root'
import { searchSheet } from './sheet/sheet'

export default definePlugin({
  name: 'palette',
  description: 'Search (mod+k) as a sheet: threads, projects, models and other actions, with pages you step through and go back from',
  inject: { kit, shell },
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

    owned(ctx, () => searchSheet(ctx.kit, ctx.shell, stack, () => query, error => void toastsOf(ctx).error('Couldn’t finish that', error)))
    const toggle = () => (stack.get().length ? host.close() : host.open())
    ctx.provide(palette, host)
    ctx.watch(keys, found => found?.bind({ key: 'mod+k', global: true, passthrough: true, run: toggle }))
    ctx.effect(() => ctx.shell.nav({ id: 'search', label: 'Search', icon: 'search', order: 0, look: 'field', keys: 'mod+k', run: () => host.open() }))
  },
})
