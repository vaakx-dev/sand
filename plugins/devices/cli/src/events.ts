import type { DaemonLink } from '@sand/host-daemon/contract'
import type { WireEvent } from '@sand/host-hub/contract'

const closedError = () => new Error('sand closed the connection')

export const heardEvents = <P>(link: DaemonLink, event: WireEvent<P>) => {
  const heard: P[] = []
  let wake = () => {}
  link.on(event, payload => {
    heard.push(payload)
    wake()
  })
  const closed = link.closed().then(() => Promise.reject(closedError()))
  closed.catch(() => {})

  return async (matches: (payload: P) => boolean, until: number): Promise<P | undefined> => {
    for (;;) {
      const found = heard.find(matches)
      if (found) return found
      const left = until - Date.now()
      if (left <= 0) return undefined
      const { promise, resolve } = Promise.withResolvers<void>()
      wake = resolve
      const timer = setTimeout(resolve, left)
      try {
        await Promise.race([promise, closed])
      } finally {
        clearTimeout(timer)
      }
    }
  }
}
