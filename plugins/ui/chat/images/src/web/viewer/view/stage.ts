import type { Point, ZoomControl } from '@sand/ui-kit/contract'
import type { Draw, Picture } from '../gallery'
import { derive, div, event, sig } from '@vaakx-dev/vrui'

const swipeDistance = 60

const RESTING: Point = { x: 0, y: 0 }

interface Drag {
  pointer: number
  start: Point
  last: Point
}

interface StageParts {
  shown: Picture
  draw: Draw
  zoom: ZoomControl
  flip(by: number): void
  close(): void
}

const pointOf = ({ clientX, clientY }: MouseEvent): Point => ({ x: clientX, y: clientY })

const swipedBy = ({ start }: Drag, end: Point) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) <= swipeDistance || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx > 0 ? -1 : 1
}

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value))

const inBounds = (image: HTMLElement, scale: number, { x, y }: Point): Point => {
  const room = (scale - 1) / 2
  return { x: clamp(x, image.offsetWidth * room), y: clamp(y, image.offsetHeight * room) }
}

export const viewerStage = ({ shown, draw, zoom, flip, close }: StageParts) => {
  const offset = sig(RESTING)
  let drag: Drag | undefined

  const moveBy = (image: HTMLElement, by: Point) => {
    const { x, y } = offset.get()
    offset.set(inBounds(image, zoom.level.get(), { x: x + by.x, y: y + by.y }))
  }

  const press = (pointer: PointerEvent) => {
    drag = pointer.isPrimary && pointer.button === 0 ? { pointer: pointer.pointerId, start: pointOf(pointer), last: pointOf(pointer) } : undefined
    if (drag && pointer.target instanceof Element) pointer.target.setPointerCapture(pointer.pointerId)
  }

  const pan = (pointer: PointerEvent) => {
    if (drag?.pointer !== pointer.pointerId || !zoom.zoomed.get()) return
    zoom.zoom({ factor: 1, from: drag.last, to: pointOf(pointer) })
    drag = { ...drag, last: pointOf(pointer) }
  }

  const release = (pointer: PointerEvent) => {
    if (drag?.pointer !== pointer.pointerId) return
    const by = swipedBy(drag, pointOf(pointer))
    drag = undefined
    if (by && !zoom.zoomed.get()) flip(by)
  }

  const cancel = () => {
    drag = undefined
  }

  const picture = draw(shown, {
    class: ['max-h-full max-w-full touch-none select-none rounded-md object-contain', () => (zoom.zoomed.get() ? 'cursor-grab' : null)],
    props: {
      onMount: (image: HTMLImageElement) => zoom.show({ node: stage, content: image, wheel: 'zooms', moveBy: by => moveBy(image, by) }),
      draggable: false,
      style: { transform: derive(() => `translate(${offset.get().x}px, ${offset.get().y}px) scale(${zoom.level.get()})`) },
      onDblClick: (click: MouseEvent) => zoom.toggle(pointOf(click)),
      onPointerDown: press,
      onPointerMove: pan,
      onPointerUp: release,
      onPointerCancel: cancel,
    },
  })

  const stage = div(
    {
      class: 'flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden px-4 pb-2 md:px-16',
      onMouseDown: event(close, { self: true }),
    },
    picture,
  )
  return stage
}
