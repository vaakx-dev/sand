import { joinDisposers } from '@sand/util'
import { derive, read, sig, type Derive, type KeyMap, type MaybeReactive } from '@vaakx-dev/vrui'
import { zoomGesture, type Point, type WheelUse, type ZoomChange } from '../gesture/zoom'

interface ZoomRange {
  least: number
  most: number
  step: number
  doubleTap: number
}

interface ZoomStage {
  node: HTMLElement
  content: Element
  wheel: WheelUse
  moveBy(by: Point): void
}

interface ZoomControlParts {
  range?: ZoomRange
  fitted?: MaybeReactive<number>
  start?: MaybeReactive<number>
}

type Chosen = 'start' | 'fit' | number

type Move = Pick<ZoomChange, 'from' | 'to'>

const PAGE_ZOOM: ZoomRange = { least: 0.25, most: 4, step: 1.4, doubleTap: 2 }

const spotIn = (box: DOMRect, at: Point): Point => ({ x: (at.x - box.left) / box.width, y: (at.y - box.top) / box.height })

const keepSpot = ({ content, moveBy }: ZoomStage, { from, to }: Move, rescale: () => void) => {
  const spot = spotIn(content.getBoundingClientRect(), from)
  rescale()
  const box = content.getBoundingClientRect()
  moveBy({ x: to.x - box.left - spot.x * box.width, y: to.y - box.top - spot.y * box.height })
}

const visibleCenter = (node: Element): Point => {
  const box = node.getBoundingClientRect()
  const left = Math.max(box.left, 0)
  const top = Math.max(box.top, 0)
  return { x: (left + Math.min(box.right, innerWidth)) / 2, y: (top + Math.min(box.bottom, innerHeight)) / 2 }
}

const aroundCenter = ({ node }: ZoomStage): Move => {
  const center = visibleCenter(node)
  return { from: center, to: center }
}

class ZoomControl {
  readonly level: Derive<number>
  readonly zoomed: Derive<boolean>
  readonly canZoomOut: Derive<boolean>
  readonly label: Derive<string>
  readonly shortcuts: KeyMap
  readonly #range: ZoomRange
  readonly #fitted: Derive<number>
  readonly #chosen = sig<Chosen>('start')
  #stage: ZoomStage | undefined

  constructor({ range = PAGE_ZOOM, fitted = 1, start = fitted }: ZoomControlParts = {}) {
    this.#range = range
    this.#fitted = derive(() => this.#clamp(read(fitted)))
    const started = derive(() => this.#clamp(read(start)))
    this.level = derive(() => this.#levelFor(this.#chosen.get(), started.get()))
    this.zoomed = derive(() => this.level.get() > this.#fitted.get())
    this.canZoomOut = derive(() => this.level.get() > range.least)
    this.label = derive(() => (this.level.get() === this.#fitted.get() ? 'Fit' : `${Math.round(this.level.get() * 100)}%`))
    this.shortcuts = { '+': this.zoomIn, '=': this.zoomIn, '-': this.zoomOut, '0': this.fit }
  }

  zoom = ({ factor, from, to }: ZoomChange) => this.#rescale(this.#scaled(factor), () => ({ from, to }))

  zoomIn = () => this.#rescale(this.#scaled(this.#range.step), aroundCenter)

  zoomOut = () => this.#rescale(this.#scaled(1 / this.#range.step), aroundCenter)

  fit = () => this.#rescale('fit', aroundCenter)

  toggle = (at: Point) => (this.zoomed.get() ? this.fit() : this.zoom({ factor: this.#range.doubleTap, from: at, to: at }))

  show = (stage: ZoomStage) => {
    this.#stage = stage
    return joinDisposers(zoomGesture(stage.node, this, { wheel: stage.wheel, surface: 'fixed' }), () => {
      this.#stage = undefined
    })
  }

  #clamp(level: number) {
    return Math.min(this.#range.most, Math.max(this.#range.least, level))
  }

  #scaled(factor: number) {
    return this.#clamp(this.level.get() * factor)
  }

  #levelFor(choice: Chosen, started: number) {
    switch (choice) {
      case 'start':
        return started
      case 'fit':
        return this.#fitted.get()
      default:
        return choice
    }
  }

  #rescale(choice: Chosen, move: (stage: ZoomStage) => Move) {
    const choose = () => this.#chosen.set(choice)
    const stage = this.#stage
    if (!stage) return choose()
    keepSpot(stage, move(stage), choose)
  }
}

export { ZoomControl, type ZoomControlParts, type ZoomRange, type ZoomStage }
