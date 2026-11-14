import { keys } from '@sand/keys/contract'
import { owned } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { effect, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { palette, visitsOf, type Palette, type PaletteLater, type PalettePage, type PaletteSource } from './contract'
import { readVisits, writeVisits } from './integrations/visits'
import { merged, rootPage } from './root'
import { searchSheet } from './sheet/sheet'
import { Visits } from './visits'

export default definePlugin({
  name: 'palette',
  description: 'Search (mod+k) as a sheet: threads, projects, models and other actions, with pages you step through and go back from',
  inject: { kit, shell },
  apply(ctx) {
    const sources = new Set<PaletteSource>()
    const laters = new Set<PaletteLater>()
    const root = rootPage(
      () => [...sources],
      () => [...laters],
    )
    const stack = sig<PalettePage[]>([])
    const visits = new Visits({ saved: readVisits(), save: writeVisits })
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
      later(source) {
        laters.add(source)
        return () => void laters.delete(source)
      },
      items: (page, typed) => merged([...sources].filter(source => source.page === page), typed),
      used: key => visits.used(key),
    }

    let shown: string | undefined
    ctx.effect(() =>
      effect(() => {
        const key = visitsOf(ctx.shell.current())
        if (shown !== undefined && key !== shown) visits.record(key)
        shown = key
      }),
    )

    owned(ctx, () =>
      searchSheet({
        kit: ctx.kit,
        shell: ctx.shell,
        stack,
        query: () => query,
        used: host.used,
        fail: error => void toastsOf(ctx).error('Couldn’t finish that', error),
      }),
    )
    const toggle = () => (stack.get().length ? host.close() : host.open())
    ctx.provide(palette, host)
    ctx.watch(keys, found => found?.bind({ key: 'mod+k', global: true, passthrough: true, run: toggle }))
    ctx.effect(() => ctx.shell.nav({ id: 'search', label: 'Search', icon: 'search', order: 0, look: 'field', keys: 'mod+k', run: () => host.open() }))
  },
})
