import { place } from '@sand/layout/place'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { panels, panelsChange, type Panels } from './contract'
import { createSurface } from './surface'
import { panelToggle } from './toggle'
import { panelsView, selectedPage, type Page } from './view'

const byOrder = (pages: Page[]) => [...pages].sort((a, b) => (a.spec.order ?? 0) - (b.spec.order ?? 0))

export default definePlugin({
  name: 'panel',
  description: 'Tabbed host for the right-hand panels that other extensions add',
  inject: { kit },
  apply(ctx) {
    const pages = sig<Page[]>([])
    const saved = ctx.hot.data.selected
    const wanted = sig(typeof saved === 'string' ? saved : undefined)
    const selected = selectedPage(pages, wanted)
    let next = 0

    const host: Panels = {
      panel(spec) {
        const page: Page = { key: next++, spec: { ...spec } }
        pages.update(list => byOrder([...list.filter(other => other.spec.id !== spec.id), page]))
        const owns = (other: Page) => other.key === page.key
        return {
          update(patch) {
            Object.assign(page.spec, patch)
            pages.update(list => byOrder(list.map(other => (owns(other) ? { key: page.key, spec: { ...page.spec } } : other))))
          },
          dispose() {
            pages.update(list => list.filter(other => !owns(other)))
          },
        }
      },
      show(id) {
        ctx.hot.data.selected = id
        wanted.set(id)
        surface.setOpen(true)
        ctx.emit(panelsChange, host.current())
      },
      hide: () => surface.setOpen(false),
      current: () => (surface.open() ? selected.get() : undefined),
    }

    const surface = createSurface(ctx, () => ctx.emit(panelsChange, host.current()))
    const toggle = panelToggle(ctx, surface, pages.map(list => list.some(page => page.spec.attention)))
    place(ctx, 'aside', () => panelsView({ kit: ctx.kit, pages, selected, surface, toggle, show: host.show, hide: host.hide }))

    ctx.effect(() => () => pages.set([]))
    ctx.provide(panels, host)
  },
})
