import type { Slide } from '@sand/ui-kit/contract'
import type { Aside, Swipe, Way } from './contract'
import type { Axis, Model } from './model'

interface Track {
  slide: Slide
  reachPx: number
  opening: 1 | -1
  settle(open: boolean): void
}

const PROJECTION_MS = 180

const dismissWay: Record<Axis, Way> = { x: 'right', y: 'down' }

const opens = (at: number, velocity: number) => at + velocity * PROJECTION_MS > 0.5

const slideSwipe = ({ slide, reachPx, opening, settle }: Track): Swipe => {
  const from = slide.at()
  slide.hold(from)
  return {
    move: delta => slide.hold(from + (opening * delta) / reachPx),
    end(velocity) {
      const speed = (opening * velocity) / reachPx
      slide.release(speed)
      settle(opens(slide.at(), speed))
    },
  }
}

const drawerSwipe = (model: Model) => slideSwipe({ slide: model.drawer, reachPx: model.drawerReach.get(), opening: 1, settle: model.setDrawer })

const backSwipe = (model: Model) => slideSwipe({ slide: model.leaving, reachPx: model.width.get(), opening: 1, settle: model.settleBack })

const rightSwipe = (model: Model) => (model.backOf(model.screen()) ? backSwipe(model) : drawerSwipe(model))

const reachOf = (model: Model, axis: Axis) => (axis === 'y' ? model.height.get() : model.width.get())

const coverSwipe = (model: Model, spec: Aside) =>
  slideSwipe({
    slide: model.coverSlide(spec.id),
    reachPx: reachOf(model, model.axisOf(spec)),
    opening: -1,
    settle: open => {
      if (open !== model.asideShown(spec)) model.showAside(spec.id, open)
    },
  })

const coverTo = (model: Model, spec: Aside | undefined) => spec && coverSwipe(model, spec)

const coveredSwipe = (model: Model, cover: Aside, way: Way) => {
  if (way === dismissWay[model.axisOf(cover)]) return coverSwipe(model, cover)
  return way === 'left' ? coverTo(model, model.nextRight()) : undefined
}

const openingSwipe = (model: Model, way: Way) => {
  switch (way) {
    case 'right':
      return rightSwipe(model)
    case 'left':
      return coverTo(model, model.nextRight())
    case 'up':
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
  if (model.sheetsShown.get().length) return undefined
  const state = model.state.get()
  if (state === 'drawer') return way === 'left' || way === 'right' ? drawerSwipe(model) : undefined
  if (state !== 'phone') return undefined
  return phoneSwipe(model, way)
}
