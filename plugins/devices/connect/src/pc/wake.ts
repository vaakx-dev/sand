import type { WakeSource } from '@sand/devices-contract'
import { hasNetwork, interfacesSignature } from './interfaces'

const pollEvery = 5000
const sleptAfter = 3 * pollEvery

export const pcWake = (): WakeSource => {
  const listeners = new Set<(cause: string) => void>()
  let poller: ReturnType<typeof setInterval> | undefined
  let signature = ''
  let tickedAt = 0

  const notify = (cause: string) => {
    for (const listener of [...listeners]) listener(cause)
  }

  const poll = () => {
    const now = Date.now()
    const slept = now - tickedAt > sleptAfter
    tickedAt = now
    const next = interfacesSignature()
    if (next !== signature) {
      signature = next
      notify('network')
    } else if (slept) notify('resume')
  }

  const start = () => {
    signature = interfacesSignature()
    tickedAt = Date.now()
    poller = setInterval(poll, pollEvery)
  }

  const stop = () => {
    clearInterval(poller)
    poller = undefined
  }

  return {
    online: hasNetwork,
    onWake(listener) {
      listeners.add(listener)
      if (!poller) start()
      return () => {
        listeners.delete(listener)
        if (!listeners.size) stop()
      }
    },
  }
}
