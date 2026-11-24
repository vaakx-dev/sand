import { div, effect, untrack } from '@vaakx-dev/vrui'
import type { Model } from './model'

const slides = (model: Model) => model.state.get() !== 'wide'

const edge = (model: Model) => (model.phone.get() ? '' : 'shadow-xl dark:ring-1 dark:ring-neutral-700')

export const drawerLook = (model: Model) => (slides(model) ? [model.kit.layer.drawer, 'absolute inset-y-0 left-0', edge(model)] : 'relative')

const offset = (model: Model) => ({ translate: `${(model.drawer.at() - 1) * 100}% 0`, visibility: model.drawerShown.get() ? 'visible' : 'hidden' })

export const drawerOffset = (model: Model) => (slides(model) ? offset(model) : null)

export const scrim = (model: Model) =>
  div({
    class: () => (slides(model) && model.drawerShown.get() ? [model.kit.layer.drawer, 'absolute inset-0 bg-black/60', model.drawerOpen.get() ? '' : 'pointer-events-none'] : 'hidden'),
    style: () => (slides(model) ? { opacity: String(model.drawer.at()) } : null),
    onClick: () => model.setDrawer(false),
  })

export const dismissDrawer = (model: Model, view: HTMLElement) =>
  effect(() => {
    if (!model.drawerOpen.get()) return
    return untrack(() => model.kit.dismissible(view, () => model.setDrawer(false), { overlay: false }))
  })
