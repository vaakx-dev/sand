import type { Swipe } from './contract'
import { drawerReach, type Model } from './model'

const projection = 180

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const passes = (px: number, velocity: number, reach: number) => px + velocity * projection > reach / 2

const stackSwipe = (model: Model, back: boolean, forward: boolean): Swipe => {
  const reach = model.width.get()
  let px = 0
  return {
    move(dx) {
      px = clamp(dx, forward ? -reach : 0, back ? reach : 0)
      model.stackDrag.set(px)
    },
    end(velocity) {
      if (px > 0 && passes(px, velocity, reach)) {
        model.stackDrag.set('back')
        return model.back()
      }
      if (px < 0 && passes(-px, -velocity, reach)) return model.forward()
      model.stackDrag.set(undefined)
    },
  }
}

const drawerSwipe = (model: Model): Swipe => {
  const from = model.drawerOpen.get() ? drawerReach : 0
  let px = from
  return {
    move(dx) {
      px = clamp(from + dx, 0, drawerReach)
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
  if (state !== 'phone') return undefined
  const back = model.pushed.get().length > 0
  const forward = model.ahead.get() > 0
  return back || forward ? stackSwipe(model, back, forward) : undefined
}
