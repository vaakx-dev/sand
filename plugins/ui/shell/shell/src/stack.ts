import { derive, div, dynamicChild, effect, list, listen, nav, onTimeout, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { sameScreen, screenKey } from './address'
import type { Route } from './contract'
import { phoneFrame } from './frames'
import { homeScreen } from './home'
import { asideKind, type Axis, type Model, type Pull } from './model'
import { asideScreen } from './aside'
import { dismissDrawer, drawerLook, drawerOffset, scrim } from './drawer'

interface Slot {
  key: string
  route?: Route
  leaving: boolean
}

const rootKey = ''

const settleMs = 300

const without = (routes: Route[], gone: Route[]) => routes.filter(route => !gone.some(other => sameScreen(other, route)))

const along = (axis: Axis, length: string) => (axis === 'y' ? `0 ${length}` : `${length} 0`)

const motion = (model: Model, depth: number, axis: Axis) => {
  const drag = model.stackDrag.get()
  return [
    typeof drag === 'number' ? 'transition-none' : 'transition-transform duration-300 ease-out',
    depth < 0 ? (axis === 'y' ? 'translate-y-full' : 'translate-x-full') : '',
    depth > 0 && model.topAxis.get() === 'x' ? '-translate-x-1/4' : '',
  ]
}

const offset = (model: Model, depth: number, axis: Axis) => {
  const drag = model.stackDrag.get()
  if (drag === undefined || depth < 0 || depth > 1) return null
  if (depth === 1 && model.topAxis.get() === 'y') return null
  if (typeof drag === 'number' && drag < 0) return depth === 0 ? { translate: `${drag / 4}px 0` } : null
  if (drag === 'back') return { translate: depth === 0 ? along(axis, '100%') : '0 0' }
  return { translate: depth === 0 ? along(axis, `${drag}px`) : `calc(${drag / 4}px - 25%) 0` }
}

const slideIn = (axis: Axis, fromPx?: number) => (node: Element) => {
  const from = fromPx === undefined ? '100%' : `calc(100% - ${fromPx}px)`
  node.animate([{ translate: along(axis, from) }, { translate: '0 0' }], { duration: settleMs, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

const peekView = (model: Model, { id, axis }: Pull) => {
  const look = () => {
    const pull = model.pull.get()
    return { translate: along(axis, `calc(100% - ${pull?.px ?? 0}px)`), transition: pull?.held ? 'none' : `translate ${settleMs}ms ease-out` }
  }
  const settle = () => {
    if (!model.pull.get()?.held) model.pull.set(undefined)
  }
  return div(
    { class: 'absolute inset-0 flex flex-col bg-neutral-900', style: () => ({ overflow: 'clip', ...look() }), inert: true, onMount: node => listen(node, 'transitionend', settle) },
    asideScreen(model, id),
  )
}

const phoneDrawer = (model: Model) => {
  const out = () => !model.drawerOpen.get() && model.drawerDrag.get() === undefined
  const filled = sig(false)
  effect(() => {
    if (!out()) filled.set(true)
    else onTimeout(() => filled.set(false), settleMs)
  })
  return nav(
    {
      class: () => ['flex h-full flex-col', drawerLook(model)],
      style: () => ({ width: '18rem', ...drawerOffset(model) }),
      inert: out,
      'aria-label': 'Sidebar',
    },
    dynamicChild(filled, shown => (shown ? homeScreen(model) : null)),
  )
}

const screenOf = (model: Model, slot: Slot) => {
  if (!slot.route) return homeScreen(model)
  if (slot.route.kind === asideKind) return asideScreen(model, slot.route.id ?? '')
  const built = model.screens.get(slot.route)
  return built ? phoneFrame(model, built) : div({ class: 'flex-1' })
}

export const phoneView = (model: Model) => {
  const fresh = new Set<string>()
  const arrivals = new Map<string, number>()
  model.leaving.set([])
  let before = untrack(() => model.pushed.get())
  const slots = derive((): Slot[] => {
    const pushed = model.pushed.get()
    return [
      { key: rootKey, leaving: false },
      ...pushed.map(route => ({ key: screenKey(route), route, leaving: false })),
      ...without(model.leaving.get(), pushed).map(route => ({ key: screenKey(route), route, leaving: true })),
    ]
  })
  const top = () => model.pushed.get().length

  const slotView = (slot: Sig<Slot>, index: Sig<number>) => {
    const depth = () => (slot.get().leaving ? -1 : top() - index.get())
    const key = slot.get().key
    const entering = fresh.has(key)
    const arrival = arrivals.get(key)
    fresh.delete(key)
    arrivals.delete(key)
    const axis = model.axisOf(slot.get().route)
    const settledBelow = sig(false)
    effect(() => {
      if (depth() > 0) onTimeout(() => settledBelow.set(true), settleMs)
      else settledBelow.set(false)
    })
    const covered = () => settledBelow.get() && (depth() > 1 || model.stackDrag.get() === undefined)
    return div(
      {
        class: () => ['absolute inset-0 flex flex-col bg-neutral-900', motion(model, depth(), axis)],
        style: () => ({ overflow: 'clip', ...offset(model, depth(), axis), ...(covered() && { contentVisibility: 'hidden' }) }),
        inert: () => depth() < 0,
        ...(entering && { onMount: slideIn(axis, arrival) }),
      },
      screenOf(model, slot.get()),
    )
  }

  const view = div({ class: 'relative min-h-0 flex-1', style: { overflow: 'clip' } })
  effect(() => {
    const now = model.pushed.get()
    untrack(() => {
      const gone = without(before, now)
      const pull = model.pull.get()
      for (const route of without(now, before)) {
        fresh.add(screenKey(route))
        if (pull && route.kind === asideKind && route.id === pull.id) arrivals.set(screenKey(route), pull.px)
      }
      before = now
      model.stackDrag.set(undefined)
      model.pull.set(undefined)
      if (!gone.length) return
      model.leaving.update(leaving => [...without(leaving, gone), ...gone])
      onTimeout(() => model.leaving.update(leaving => without(leaving, gone)), settleMs, view)
    })
  })
  list(slots, slot => slot.key, slotView, view)
  const frame = div(
    { class: 'relative flex min-h-0 flex-1 flex-col', style: { overflow: 'clip' } },
    view,
    dynamicChild(
      derive(() => model.pull.get()?.id),
      id => {
        const pull = untrack(() => model.pull.get())
        return id && pull ? peekView(model, pull) : null
      },
    ),
    scrim(model),
    phoneDrawer(model),
  )
  dismissDrawer(model, frame)
  return frame
}
