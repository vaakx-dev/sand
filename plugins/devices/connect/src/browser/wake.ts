import type { WakeSource } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { listen } from '@vaakx-dev/vrui'

export const pageVisible = () => document.visibilityState === 'visible'

export const browserWake = (): WakeSource => ({
  online: () => navigator.onLine,
  onWake(listener) {
    const shown = () => {
      if (pageVisible()) listener('visible')
    }
    return joinDisposers(
      listen(window, 'online', () => listener('online')),
      listen(window, 'offline', () => listener('offline')),
      listen(window, 'focus', () => listener('focus')),
      listen(window, 'pageshow', () => listener('pageshow')),
      listen(document, 'visibilitychange', shown),
    )
  },
})
