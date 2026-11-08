import { div, dynamicChild, effect, untrack } from '@vaakx-dev/vrui'
import { deskFrames } from './frames'
import { drawerReach, type Model } from './model'
import { sidebar } from './sidebar'

const drawerLook = (model: Model) => {
  const { drawerDrag, drawerOpen, kit } = model
  if (model.state.get() !== 'drawer') return 'relative'
  return [
    kit.layer.drawer,
    'absolute inset-y-0 left-0 shadow-xl',
    drawerDrag.get() === undefined ? 'transition-transform duration-300 ease-out' : 'transition-none',
    drawerOpen.get() ? '' : '-translate-x-full',
  ]
}

const drawerOffset = (model: Model) => {
  const px = model.drawerDrag.get()
  return px === undefined || model.state.get() !== 'drawer' ? null : { translate: `calc(${px}px - 100%) 0` }
}

const scrim = (model: Model) => {
  const shown = () => model.state.get() === 'drawer' && (model.drawerOpen.get() || model.drawerDrag.get() !== undefined)
  return div({
    class: () => (shown() ? [model.kit.layer.drawer, 'absolute inset-0 bg-black/60 transition-opacity duration-300'] : 'hidden'),
    style: () => {
      const px = model.drawerDrag.get()
      return px === undefined ? null : { opacity: String(px / drawerReach), transition: 'none' }
    },
    onClick: () => model.setDrawer(false),
  })
}

export const deskView = (model: Model) => {
  const view = div(
    { class: 'relative flex min-h-0 min-w-0 flex-1' },
    scrim(model),
    sidebar(model, { class: () => drawerLook(model), style: () => drawerOffset(model) }),
    dynamicChild(model.screen, built => (built ? deskFrames(model, built) : div({ class: 'flex-1' }))),
  )
  effect(() => {
    if (!model.drawerOpen.get()) return
    return untrack(() => model.kit.dismissible(view, () => model.setDrawer(false), { overlay: false }))
  })
  return view
}
