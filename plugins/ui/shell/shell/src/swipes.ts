import type { Aside, Swipe, Way } from './contract'
import { asideKind, drawerReach, type Axis, type Model } from './model'

const projection = 180

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const passes = (px: number, velocity: number, reach: number) => px + velocity * projection > reach / 2

const reachOf = (model: Model, axis: Axis) => (axis === 'y' ? model.height.get() : model.width.get())

const stackSwipe = (model: Model): Swipe => {
  const reach = reachOf(model, model.topAxis.get())
  let px = 0
  return {
    move(delta) {
      px = clamp(delta, 0, reach)
      model.stackDrag.set(px)
    },
    end(velocity) {
      if (px > 0 && passes(px, velocity, reach)) {
        model.stackDrag.set('back')
        return model.back()
      }
      model.stackDrag.set(undefined)
    },
  }
}

const pullSwipe = (model: Model, spec: Aside, axis: Axis): Swipe => {
  const reach = reachOf(model, axis)
  let px = 0
  const show = (held: boolean) => {
    model.pull.set({ id: spec.id, axis, px, held })
    if (axis === 'x') model.stackDrag.set(held ? -px : undefined)
  }
  return {
    move(delta) {
      px = clamp(-delta, 0, reach)
      show(true)
    },
    end(velocity) {
      if (px > 0 && passes(px, -velocity, reach)) return model.open({ kind: asideKind, id: spec.id })
      px = 0
      show(false)
    },
  }
}

const drawerSwipe = (model: Model): Swipe => {
  const from = model.drawerOpen.get() ? drawerReach : 0
  let px = from
  return {
    move(delta) {
      px = clamp(from + delta, 0, drawerReach)
      model.drawerDrag.set(px)
    },
    end(velocity) {
      model.drawerDrag.set(undefined)
      model.setDrawer(passes(px, velocity, drawerReach))
    },
  }
}

const sidewaysOnPhone = (model: Model, way: Way) => {
  if (model.drawerOpen.get()) return way === 'left' ? drawerSwipe(model) : undefined
  if (way === 'right') return model.pushedAside.get() ? stackSwipe(model) : drawerSwipe(model)
  const next = model.nextRight()
  return next && pullSwipe(model, next, 'x')
}

const verticalOnPhone = (model: Model, way: Way) => {
  if (model.drawerOpen.get()) return undefined
  if (way === 'down') return model.topAxis.get() === 'y' ? stackSwipe(model) : undefined
  const below = model.bottomAside()
  return below && pullSwipe(model, below, 'y')
}

const phoneSwipe = (model: Model, way: Way) => {
  if (model.pushed.get().length === 0) return undefined
  return way === 'left' || way === 'right' ? sidewaysOnPhone(model, way) : verticalOnPhone(model, way)
}

export const edgeSwipe = (model: Model, way: Way): Swipe | undefined => {
  if (model.sheetShown.get()) return undefined
  const state = model.state.get()
  if (state === 'drawer') return way === 'left' || way === 'right' ? drawerSwipe(model) : undefined
  if (state !== 'phone') return undefined
  return phoneSwipe(model, way)
}
