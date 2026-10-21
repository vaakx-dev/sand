import { byId, collectScope, disposeAll, div, mount, type Child } from '@vaakx-dev/vrui'
import type { Context, Dispose } from 'drydock'
import { owned } from '@sand/web-client/reactive'
import { layout, type Region } from './contract'

export const cssOrder = (order: number) => String(Math.round(order * 10))

const loose = (region: Region, view: HTMLElement, order: number): Dispose =>
  mount(byId('stage'), div({ class: 'relative w-full max-h-96 shrink-0 overflow-auto', 'data-region': region, style: { order: cssOrder(order) } }, view))

export const running = (ctx: Context) => ctx.scope.status === 'starting' || ctx.scope.status === 'active'

export const place = (ctx: Context, region: Region, view: HTMLElement | (() => HTMLElement), order = 0) =>
  ctx.watch(layout, found => {
    if (!running(ctx)) return
    const { value, scope } = typeof view === 'function' ? collectScope(view) : { value: view, scope: [] }
    const unmount = found ? found.mount(region, value, order) : loose(region, value, order)
    return () => {
      void unmount()
      disposeAll(scope)
    }
  })

export const floating = (ctx: Context, build: () => Child) => owned(ctx, () => mount(document.body, build()))

export const closeDrawer = (ctx: Context) => {
  const found = ctx.get(layout)
  if (found?.state().narrow) found.toggle('side', false)
}
