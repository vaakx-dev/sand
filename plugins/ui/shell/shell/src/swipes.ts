import type { Aside, Swipe, Way } from './contract'
import type { Axis, Model } from './model'

const projection = 180

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const passes = (px: number, velocity: number, reach: number) => px + velocity * projection > reach / 2

const reachOf = (model: Model, axis: Axis) => (axis === 'y' ? model.height.get() : model.width.get())

const pullSwipe = (model: Model, spec: Aside): Swipe => {
  const reach = reachOf(model, model.axisOf(spec))
  let px = 0
  return {
    move(delta) {
      px = clamp(-delta, 0, reach)
      model.pull.set({ id: spec.id, px, held: true })
    },
    end(velocity) {
      model.pull.set(undefined)
      if (px > 0 && passes(px, -velocity, reach)) model.showAside(spec.id, true)
    },
  }
}

const dismissSwipe = (model: Model, spec: Aside): Swipe => {
  const reach = reachOf(model, model.axisOf(spec))
  let px = reach
  return {
    move(delta) {
      px = clamp(reach - delta, 0, reach)
      model.pull.set({ id: spec.id, px, held: true })
    },
    end(velocity) {
      model.pull.set(undefined)
      if (px < reach && passes(reach - px, velocity, reach)) model.showAside(spec.id, false)
    },
  }
}

const drawerSwipe = (model: Model): Swipe => {
  const reach = model.drawerReach.get()
  const from = model.drawerOpen.get() ? reach : 0
  let px = from
  return {
    move(delta) {
      px = clamp(from + delta, 0, reach)
      model.drawerDrag.set(px)
    },
    end(velocity) {
      model.drawerDrag.set(undefined)
      model.setDrawer(passes(px, velocity, reach))
    },
  }
}

const dismissWay: Record<Axis, Way> = { x: 'right', y: 'down' }

const pullTo = (model: Model, spec: Aside | undefined) => spec && pullSwipe(model, spec)

const coveredSwipe = (model: Model, cover: Aside, way: Way) => {
  if (way === dismissWay[model.axisOf(cover)]) return dismissSwipe(model, cover)
  return way === 'left' ? pullTo(model, model.nextRight()) : undefined
}

const openingSwipe = (model: Model, way: Way) => {
  switch (way) {
    case 'right':
      return drawerSwipe(model)
    case 'left':
      return pullTo(model, model.nextRight())
    case 'up':
      return pullTo(model, model.bottomAside())
    case 'down':
      return undefined
  }
}

const phoneSwipe = (model: Model, way: Way) => {
  if (model.drawerOpen.get()) return way === 'left' ? drawerSwipe(model) : undefined
  const cover = model.coverAside.get()
  return cover ? coveredSwipe(model, cover, way) : openingSwipe(model, way)
}

export const edgeSwipe = (model: Model, way: Way): Swipe | undefined => {
  if (model.sheetShown.get()) return undefined
  const state = model.state.get()
  if (state === 'drawer') return way === 'left' || way === 'right' ? drawerSwipe(model) : undefined
  if (state !== 'phone') return undefined
  return phoneSwipe(model, way)
}
