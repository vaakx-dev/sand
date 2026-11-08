import { derive, div, effect, list, onTimeout, untrack, type Sig } from '@vaakx-dev/vrui'
import { sameScreen, screenKey } from './address'
import type { Route } from './contract'
import { phoneFrame } from './frames'
import { homeScreen } from './home'
import type { Model } from './model'

interface Slot {
  key: string
  route?: Route
  leaving: boolean
}

const rootKey = ''

const settleMs = 300

const without = (routes: Route[], gone: Route[]) => routes.filter(route => !gone.some(other => sameScreen(other, route)))

const motion = (model: Model, depth: number) => {
  const drag = model.backDrag.get()
  return [
    typeof drag === 'number' ? 'transition-none' : 'transition-transform duration-300 ease-out',
    depth < 0 ? 'translate-x-full' : depth > 0 ? '-translate-x-1/4' : '',
  ]
}

const offset = (model: Model, depth: number) => {
  const drag = model.backDrag.get()
  if (drag === undefined || depth < 0 || depth > 1) return null
  if (drag === 'back') return { translate: depth === 0 ? '100% 0' : '0 0' }
  return { translate: depth === 0 ? `${drag}px 0` : `calc(${drag / 4}px - 25%) 0` }
}

const slideIn = (node: Element) => {
  node.animate([{ translate: '100% 0' }, { translate: '0 0' }], { duration: settleMs, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

const screenOf = (model: Model, slot: Slot) => {
  if (!slot.route) return homeScreen(model)
  const built = model.screens.get(slot.route)
  return built ? phoneFrame(model, built) : div({ class: 'flex-1' })
}

export const phoneView = (model: Model) => {
  const fresh = new Set<string>()
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
    const entering = fresh.delete(slot.get().key)
    return div(
      {
        class: () => ['absolute inset-0 flex flex-col bg-neutral-900', motion(model, depth())],
        style: () => ({ overflow: 'clip', ...offset(model, depth()) }),
        inert: () => depth() !== 0,
        ...(entering && { onMount: slideIn }),
      },
      screenOf(model, slot.get()),
    )
  }

  const view = div({ class: 'relative min-h-0 flex-1', style: { overflow: 'clip' } })
  effect(() => {
    const now = model.pushed.get()
    untrack(() => {
      const gone = without(before, now)
      for (const route of without(now, before)) fresh.add(screenKey(route))
      before = now
      model.backDrag.set(undefined)
      if (!gone.length) return
      model.leaving.update(leaving => [...without(leaving, gone), ...gone])
      onTimeout(() => model.leaving.update(leaving => without(leaving, gone)), settleMs, view)
    })
  })
  return list(slots, slot => slot.key, slotView, view)
}
