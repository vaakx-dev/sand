import { running } from '@sand/reactive'
import { byId, collectScope, disposeAll, div, mount } from '@vaakx-dev/vrui'
import type { Context, Dispose } from 'drydock'
import { layout, type Target } from './layout'

export const cssOrder = (order: number) => String(Math.round(order * 10))

const regionOf = (target: Target) => (typeof target === 'string' ? target : target.region)

const loose = (target: Target, view: HTMLElement, order: number): Dispose =>
  mount(byId('stage'), div({ class: 'relative w-full max-h-96 shrink-0 overflow-auto', 'data-region': regionOf(target), style: { order: cssOrder(order) } }, view))

export const place = (ctx: Context, target: Target, view: HTMLElement | (() => HTMLElement), order = 0) =>
  ctx.watch(layout, found => {
    if (!running(ctx)) return
    const { value, scope } = typeof view === 'function' ? collectScope(view) : { value: view, scope: [] }
    const unmount = found ? found.mount(target, value, order) : loose(target, value, order)
    return () => {
      void unmount()
      disposeAll(scope)
    }
  })

export const closeDrawer = (ctx: Context) => ctx.get(layout)?.handOff()
