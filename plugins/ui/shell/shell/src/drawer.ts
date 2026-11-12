import { div, effect, untrack } from '@vaakx-dev/vrui'
import { drawerReach, type Model } from './model'

const slides = (model: Model) => model.state.get() !== 'wide'

export const drawerLook = (model: Model) => {
  const { drawerDrag, drawerOpen, kit } = model
  if (!slides(model)) return 'relative'
  return [
    kit.layer.drawer,
    'absolute inset-y-0 left-0 shadow-xl dark:ring-1 dark:ring-neutral-700',
    drawerDrag.get() === undefined ? 'transition-transform duration-300 ease-out' : 'transition-none',
    drawerOpen.get() ? '' : '-translate-x-full',
  ]
}

export const drawerOffset = (model: Model) => {
  const px = model.drawerDrag.get()
  return px === undefined || !slides(model) ? null : { translate: `calc(${px}px - 100%) 0` }
}

export const scrim = (model: Model) => {
  const shown = () => slides(model) && (model.drawerOpen.get() || model.drawerDrag.get() !== undefined)
  return div({
    class: () => (shown() ? [model.kit.layer.drawer, 'absolute inset-0 bg-black/60 transition-opacity duration-300'] : 'hidden'),
    style: () => {
      const px = model.drawerDrag.get()
      return px === undefined ? null : { opacity: String(px / drawerReach), transition: 'none' }
    },
    onClick: () => model.setDrawer(false),
  })
}

export const dismissDrawer = (model: Model, view: HTMLElement) =>
  effect(() => {
    if (!model.drawerOpen.get()) return
    return untrack(() => model.kit.dismissible(view, () => model.setDrawer(false), { overlay: false }))
  })
