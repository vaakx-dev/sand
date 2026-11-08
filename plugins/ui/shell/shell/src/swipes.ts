import type { Swipe } from './contract'
import { drawerReach, type Model } from './model'

const projection = 180

const clamp = (value: number, reach: number) => Math.min(Math.max(value, 0), reach)

const passes = (px: number, velocity: number, reach: number) => px + velocity * projection > reach / 2

const backSwipe = (model: Model): Swipe => {
  const reach = model.width.get()
  let px = 0
  return {
    move(dx) {
      px = clamp(dx, reach)
      model.backDrag.set(px)
    },
    end(velocity) {
      if (!passes(px, velocity, reach)) return model.backDrag.set(undefined)
      model.backDrag.set('back')
      model.back()
    },
  }
}

const drawerSwipe = (model: Model): Swipe => {
  const from = model.drawerOpen.get() ? drawerReach : 0
  let px = from
  return {
    move(dx) {
      px = clamp(from + dx, drawerReach)
      model.drawerDrag.set(px)
    },
    end(velocity) {
      model.drawerDrag.set(undefined)
      model.setDrawer(passes(px, velocity, drawerReach))
    },
  }
}

export const edgeSwipe = (model: Model): Swipe | undefined => {
  if (model.sheetShown.get()) return undefined
  const state = model.state.get()
  if (state === 'drawer') return drawerSwipe(model)
  if (state === 'phone' && model.pushed.get().length) return backSwipe(model)
  return undefined
}
