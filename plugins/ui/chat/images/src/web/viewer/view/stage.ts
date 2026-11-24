import type { Kit, Point, ZoomChange } from '@sand/ui-kit/contract'
import type { Draw, Picture } from '../gallery'
import type { Zoom } from './zoom'
import { div, event } from '@vaakx-dev/vrui'

const swipeDistance = 60

interface Drag {
  pointer: number
  start: Point
  last: Point
}

interface StageParts {
  kit: Kit
  shown: Picture
  draw: Draw
  zoom: Zoom
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

export const viewerStage = ({ kit, shown, draw, zoom, flip, close }: StageParts) => {
  let image: HTMLImageElement | undefined
  let drag: Drag | undefined

  const zoomImage = (change: ZoomChange) => image && zoom.zoom(change, image)
  const toggle = (at: Point) => image && zoom.toggle(at, image)

  const press = (pointer: PointerEvent) => {
    drag = pointer.isPrimary && pointer.button === 0 ? { pointer: pointer.pointerId, start: pointOf(pointer), last: pointOf(pointer) } : undefined
    if (drag) image?.setPointerCapture(pointer.pointerId)
  }

  const pan = (pointer: PointerEvent) => {
    if (drag?.pointer !== pointer.pointerId || !zoom.zoomed.get()) return
    zoomImage({ factor: 1, from: drag.last, to: pointOf(pointer) })
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
      ref: (node: HTMLImageElement) => {
        image = node
      },
      draggable: false,
      style: { transform: zoom.transform },
      onDblClick: (click: MouseEvent) => toggle(pointOf(click)),
      onPointerDown: press,
      onPointerMove: pan,
      onPointerUp: release,
      onPointerCancel: cancel,
    },
  })

  return div(
    {
      class: 'flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden px-4 pb-2 md:px-16',
      onMouseDown: event(close, { self: true }),
      onMount: node => kit.gesture.zoomGesture(node, { zoom: zoomImage, toggle }, { wheel: 'zooms', surface: 'fixed' }),
    },
    picture,
  )
}
