import { derive, sig } from '@vaakx-dev/vrui'

const fit = 1
const most = 4
const step = 1.5
const wheelSpeed = 500

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value))

export const zoomState = () => {
  const scale = sig(fit)
  const offset = sig({ x: 0, y: 0 })

  const zoomTo = (wanted: number) => {
    const next = Math.min(most, Math.max(fit, wanted))
    const kept = scale.get() > fit ? (next - fit) / (scale.get() - fit) : 0
    offset.set({ x: offset.get().x * kept, y: offset.get().y * kept })
    scale.set(next)
  }

  const pan = (dx: number, dy: number, image: HTMLElement) => {
    const room = (scale.get() - fit) / 2
    offset.set({ x: clamp(offset.get().x + dx, image.offsetWidth * room), y: clamp(offset.get().y + dy, image.offsetHeight * room) })
  }

  return {
    zoomed: derive(() => scale.get() > fit),
    label: derive(() => (scale.get() === fit ? 'Fit' : `${Math.round(scale.get() * 100)}%`)),
    transform: derive(() => `translate(${offset.get().x}px, ${offset.get().y}px) scale(${scale.get()})`),
    zoomIn: () => zoomTo(scale.get() * step),
    zoomOut: () => zoomTo(scale.get() / step),
    wheel: (delta: number) => zoomTo(scale.get() * Math.exp(-delta / wheelSpeed)),
    toggle: () => zoomTo(scale.get() === fit ? 2 : fit),
    fit: () => zoomTo(fit),
    pan,
  }
}

export type Zoom = ReturnType<typeof zoomState>
