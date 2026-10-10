import { collectScope, disposeAll, div, layer, mount, type Layout } from '@sand/dom'
import type { Dispose } from 'drydock'

export const cover = (layout: Layout | undefined, side: () => HTMLElement, main: () => HTMLElement): Dispose => {
  const built = [collectScope(side), collectScope(main)] as const
  const [nav, page] = built
  const stops = layout
    ? [layout.cover('side', nav.value), layout.cover('main', page.value)]
    : [mount(document.body, div({ class: [layer.drawer, 'fixed inset-0 flex bg-neutral-900'] }, nav.value, page.value))]
  return () => {
    stops.forEach(stop => void stop())
    built.forEach(({ scope }) => disposeAll(scope))
  }
}
