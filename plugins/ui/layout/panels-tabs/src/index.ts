import type { Panels } from './contract'
import { sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { createSurface } from './surface'
import { panelsView, selectedPage, type Page } from './view'

const byOrder = (pages: Page[]) => [...pages].sort((a, b) => (a.spec.order ?? 0) - (b.spec.order ?? 0))

export default definePlugin({
  name: 'panels-tabs',
  description: 'Tabbed host for the right-hand panels: edits, agents, tree',
  uses: { layout: 'opens as a drawer over the page' },
  apply(ctx) {
    const pages = sig<Page[]>([])
    const wanted = sig(ctx.hot.data.selected as string | undefined)
    const selected = selectedPage(pages, wanted)
    let next = 0

    const panels: Panels = {
      panel(spec) {
        const page: Page = { key: next++, spec: { ...spec } }
        pages.update(list => byOrder([...list.filter(other => other.spec.id !== spec.id), page]))
        surface.sync(true)
        const owns = (other: Page) => other.key === page.key
        return {
          update(patch) {
            Object.assign(page.spec, patch)
            pages.update(list => list.map(other => (owns(other) ? { key: page.key, spec: { ...page.spec } } : other)))
          },
          dispose() {
            pages.update(list => list.filter(other => !owns(other)))
            surface.sync(pages.get().length > 0)
          },
        }
      },
      show(id) {
        ctx.hot.data.selected = id
        wanted.set(id)
        surface.setOpen(true)
        ctx.emit('panels.change', panels.current())
      },
      toggle(id) {
        if (panels.current() === id) panels.hide()
        else panels.show(id)
      },
      hide: () => surface.setOpen(false),
      current: () => (surface.open() ? selected.get() : undefined),
      list: () => pages.get().map(page => page.spec.id),
    }

    const surface = createSurface(
      ctx,
      () => panelsView({ pages, selected, surface, show: panels.show, hide: panels.hide }),
      () => ctx.emit('panels.change', panels.current()),
    )

    ctx.effect(() => () => pages.set([]))
    ctx.provide('panels', panels)
  },
})
