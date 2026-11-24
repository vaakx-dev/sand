import { zoomGesture } from '@sand/ui-kit/contract'
import { listen } from '@vaakx-dev/vrui'
import { zoomable, zoomBy, zoomToggle } from '../protocol'
import { post } from './post'

const relay = () => zoomGesture(window, { zoom: change => post(zoomBy, change), toggle: at => post(zoomToggle, { at }) }, { wheel: 'scrolls', surface: 'scaled' })

export const relayZoom = () => {
  const stop = listen<MessageEvent>(window, 'message', ({ source, data }) => {
    if (source !== window.parent || data?.method !== zoomable) return
    stop()
    relay()
  })
}
