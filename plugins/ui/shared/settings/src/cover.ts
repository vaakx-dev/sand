import type { Layout } from '@sand/layout/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { collectScope, disposeAll, div, mount } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'

export const cover = ({ layer }: Kit, layout: Layout | undefined, side: () => HTMLElement, main: () => HTMLElement): Dispose => {
  const nav = collectScope(side)
  const page = collectScope(main)
  const stops = layout
    ? [layout.cover('side', nav.value), layout.cover('main', page.value)]
    : [mount(document.body, div({ class: [layer.drawer, 'fixed inset-0 flex bg-neutral-900'] }, nav.value, page.value))]
  return () => {
    for (const stop of stops) void stop()
    disposeAll(nav.scope)
    disposeAll(page.scope)
  }
}
