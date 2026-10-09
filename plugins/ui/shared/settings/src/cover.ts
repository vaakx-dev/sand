import type { Layout } from '@sand/protocol'
import { collectScope, disposeAll, div, float, layer } from '@sand/dom'
import type { Dispose } from 'drydock'

export const cover = (layout: Layout | undefined, side: () => HTMLElement, main: () => HTMLElement): Dispose => {
  const built = [collectScope(side), collectScope(main)] as const
  const [nav, page] = built
  const stops = layout
    ? [layout.cover('side', nav.value), layout.cover('main', page.value)]
    : [float(div({ class: [layer.drawer, 'fixed inset-0 flex bg-neutral-900'] }, nav.value, page.value))]
  return () => {
    stops.forEach(stop => void stop())
    built.forEach(({ scope }) => disposeAll(scope))
  }
}
