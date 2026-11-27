import { zoomGesture } from '@sand/ui-kit/contract'
import { listen } from '@vaakx-dev/vrui'
import { zoomable, zoomAnchor, zoomBy, zoomToggle } from '../protocol'
import { post } from './post'

const anchor = (spot: Touch | MouseEvent) => post(zoomAnchor, { screen: { x: spot.screenX, y: spot.screenY }, page: { x: spot.clientX, y: spot.clientY } })

const relay = () => {
  listen<TouchEvent>(
    window,
    'touchstart',
    ({ touches: [touch] }) => {
      if (touch) anchor(touch)
    },
    { passive: true },
  )
  listen<WheelEvent>(window, 'wheel', anchor, { passive: true })
  zoomGesture(window, { zoom: change => post(zoomBy, change), toggle: at => post(zoomToggle, { at }) }, { wheel: 'scrolls', points: 'screen' })
}

export const relayZoom = () => {
  const stop = listen<MessageEvent>(window, 'message', ({ source, data }) => {
    if (source !== window.parent || data?.method !== zoomable) return
    stop()
    relay()
  })
}
