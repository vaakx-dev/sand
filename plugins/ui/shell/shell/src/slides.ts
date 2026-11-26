import { Slide } from '@sand/ui-kit/contract'
import { derive, effect, untrack, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { Aside, ShellState } from './contract'
import type { Layers } from './layer'
import { SIDE_WIDTH } from './layout'

type Axis = 'x' | 'y'

interface SlideParts {
  layers: Layers
  width: Sig<number>
  phone: Derive<boolean>
  state: Derive<ShellState>
  shownAsides: Derive<Aside[]>
}

const extent = (open: boolean) => (open ? 1 : 0)

const axisOf = (spec: Aside): Axis => (spec.kind === 'drawer' ? 'y' : 'x')

const drawerSlide = ({ layers, width, phone, state }: SlideParts) => {
  const drawerOpen = derive(() => state.get() !== 'wide' && layers.inDrawer.get())
  const drawer = new Slide(extent(untrack(() => drawerOpen.get())))
  effect(() => {
    const target = extent(drawerOpen.get())
    untrack(() => drawer.aim(target))
  })
  return {
    drawer,
    drawerOpen,
    drawerShown: derive(() => drawer.at() > 0),
    drawerReach: derive(() => (phone.get() ? width.get() : SIDE_WIDTH)),
    setDrawer(open: boolean) {
      if (open === drawerOpen.get()) return
      if (open) layers.enterDrawer()
      else layers.leave()
    },
  }
}

const coverSlides = ({ layers, phone, shownAsides }: SlideParts) => {
  const coverIds = derive(() => (phone.get() ? layers.coverIds.get() : []))
  const coverId = derive(() => coverIds.get().at(-1))
  const coverStack = derive(() => coverIds.get().flatMap(id => shownAsides.get().filter(spec => spec.id === id)))
  const coverAside = derive(() => shownAsides.get().find(spec => spec.id === coverId.get()))

  const slides = new Map<string, Slide>()
  const coverSlide = (id: string) => {
    const found = slides.get(id)
    if (found) return found
    const made = new Slide(0)
    slides.set(id, made)
    return made
  }
  const sliding = (stack: Aside[]) => (spec: Aside) => !stack.includes(spec) && coverSlide(spec.id).at() > 0
  effect(() => {
    const ids = coverIds.get()
    untrack(() => {
      for (const id of ids) coverSlide(id)
      for (const [id, slide] of slides) slide.aim(extent(ids.includes(id)))
    })
  })

  const raiseCover = (id: string) => {
    const ids = coverIds.get()
    const at = ids.indexOf(id)
    layers.enterCovers(at < 0 ? [...ids, id] : ids.slice(0, at + 1))
  }
  const lowerCover = (id: string) => {
    const ids = coverIds.get()
    if (ids.at(-1) === id) layers.enterCovers(ids.slice(0, -1))
  }

  const rightAsides = derive(() => shownAsides.get().filter(spec => axisOf(spec) === 'x'))
  const nextRight = () => {
    const top = coverAside.get()
    if (!top) return rightAsides.get()[0]
    const shown = rightAsides.get()
    const at = shown.indexOf(top)
    return at < 0 ? undefined : shown[at + 1]
  }

  return {
    coverId,
    coverAside,
    coverSlide,
    covers: derive(() => {
      const stack = coverStack.get()
      return [...stack, ...shownAsides.get().filter(sliding(stack))]
    }),
    showCover: (id: string, show: boolean) => (show ? raiseCover(id) : lowerCover(id)),
    showChat() {
      if (coverIds.get().length) layers.leave()
    },
    nextRight,
  }
}

const shellSlides = (parts: SlideParts) => {
  const drawer = drawerSlide(parts)
  const covers = coverSlides(parts)
  return { ...drawer, ...covers, axisOf, covered: derive(() => drawer.drawerOpen.get() || Boolean(covers.coverAside.get())) }
}

export { shellSlides, type Axis }
