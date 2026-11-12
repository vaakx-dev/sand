import { derive, div, effect, list, onTimeout, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { asideScreen } from './aside'
import type { Aside } from './contract'
import type { Axis, Model } from './model'

const settleMs = 300

const along = (axis: Axis, length: string) => (axis === 'y' ? `0 ${length}` : `${length} 0`)

const heldPx = (model: Model, id: string) => {
  const pull = model.pull.get()
  return pull?.id === id ? pull.px : undefined
}

const active = (model: Model, id: string) => model.coverAside.get()?.id === id || heldPx(model, id) !== undefined

const look = (model: Model, spec: Aside) => {
  const axis = model.axisOf(spec)
  const px = heldPx(model, spec.id)
  if (px !== undefined) return { translate: along(axis, `calc(100% - ${px}px)`), transition: 'none' }
  const open = model.coverAside.get()?.id === spec.id
  return { translate: along(axis, open ? '0' : '100%'), transition: `translate ${settleMs}ms ease-out` }
}

const slideIn = (model: Model, spec: Aside) => (node: Element) => {
  if (untrack(() => heldPx(model, spec.id)) !== undefined) return
  const axis = model.axisOf(spec)
  node.animate([{ translate: along(axis, '100%') }, { translate: along(axis, '0') }], { duration: settleMs, easing: 'cubic-bezier(.2,.8,.2,1)' })
}

export const asideCovers = (model: Model) => {
  const shown = sig<Aside[]>([])
  const raised = derive(() => model.shownAsides.get().filter(spec => active(model, spec.id)))
  effect(() => {
    const top = raised.get()
    untrack(() => shown.update(all => [...all.filter(spec => !top.includes(spec)), ...top]))
  })
  const coverView = (spec: Sig<Aside>) => {
    const { id } = spec.get()
    effect(() => {
      if (!active(model, id)) onTimeout(() => shown.update(all => all.filter(other => other.id !== id)), settleMs)
    })
    return div(
      {
        class: 'absolute inset-0 flex flex-col bg-neutral-950',
        style: () => ({ overflow: 'clip', ...look(model, spec.get()) }),
        inert: () => model.coverAside.get()?.id !== id,
        onMount: slideIn(model, spec.get()),
      },
      asideScreen(model, spec.get()),
    )
  }
  return list(shown, spec => spec.id, coverView, div({ class: 'contents' }))
}
