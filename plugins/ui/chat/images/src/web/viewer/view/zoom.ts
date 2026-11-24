import type { Point, ZoomChange } from '@sand/ui-kit/contract'
import { derive, sig } from '@vaakx-dev/vrui'

interface View {
  scale: number
  x: number
  y: number
}

const FIT = 1
const MOST = 8
const STEP = 1.5
const DOUBLE_TAP_ZOOM = 2.5

const FITTED: View = { scale: FIT, x: 0, y: 0 }

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value))

const clampScale = (scale: number) => Math.min(MOST, Math.max(FIT, scale))

const restingCenter = (image: HTMLElement, { x, y }: View): Point => {
  const box = image.getBoundingClientRect()
  return { x: box.left + box.width / 2 - x, y: box.top + box.height / 2 - y }
}

const inBounds = (image: HTMLElement, { scale, x, y }: View): View => {
  const room = (scale - FIT) / 2
  return { scale, x: clamp(x, image.offsetWidth * room), y: clamp(y, image.offsetHeight * room) }
}

const zoomed = (image: HTMLElement, view: View, { factor, from, to }: ZoomChange): View => {
  const center = restingCenter(image, view)
  const scale = clampScale(view.scale * factor)
  const ratio = scale / view.scale
  const x = to.x - center.x - (from.x - center.x - view.x) * ratio
  const y = to.y - center.y - (from.y - center.y - view.y) * ratio
  return inBounds(image, { scale, x, y })
}

const rescaled = (view: View, wanted: number): View => {
  const scale = clampScale(wanted)
  const kept = view.scale > FIT ? (scale - FIT) / (view.scale - FIT) : 0
  return { scale, x: view.x * kept, y: view.y * kept }
}

export const zoomState = () => {
  const view = sig(FITTED)
  const zoomTo = (wanted: number) => view.set(rescaled(view.get(), wanted))
  const zoom = (change: ZoomChange, image: HTMLElement) => view.set(zoomed(image, view.get(), change))
  const fit = () => view.set(FITTED)

  return {
    zoomed: derive(() => view.get().scale > FIT),
    label: derive(() => (view.get().scale === FIT ? 'Fit' : `${Math.round(view.get().scale * 100)}%`)),
    transform: derive(() => `translate(${view.get().x}px, ${view.get().y}px) scale(${view.get().scale})`),
    zoomIn: () => zoomTo(view.get().scale * STEP),
    zoomOut: () => zoomTo(view.get().scale / STEP),
    toggle: (at: Point, image: HTMLElement) => (view.get().scale > FIT ? fit() : zoom({ factor: DOUBLE_TAP_ZOOM, from: at, to: at }, image)),
    zoom,
    fit,
  }
}

export type Zoom = ReturnType<typeof zoomState>
