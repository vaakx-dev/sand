import type { Region } from '@sand/protocol'
import { byId, collectScope, disposeAll, div, mount } from '@vaakx-dev/vrui'
import type { Context, Dispose } from 'drydock'

export const stage = () => byId('stage')

export const cssOrder = (order: number) => String(Math.round(order * 10))

const loose = (region: Region, view: HTMLElement, order: number): Dispose =>
  mount(stage(), div({ class: 'relative w-full max-h-96 shrink-0 overflow-auto', 'data-region': region, style: { order: cssOrder(order) } }, view))

export const place = (ctx: Context, region: Region, view: HTMLElement | (() => HTMLElement), order = 0) =>
  ctx.watch('layout', layout => {
    const { value, scope } = typeof view === 'function' ? collectScope(view) : { value: view, scope: [] }
    const unmount = layout ? layout.mount(region, value, order) : loose(region, value, order)
    return () => {
      void unmount()
      disposeAll(scope)
    }
  })
