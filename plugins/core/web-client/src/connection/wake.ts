import { listen } from '@sand/dom'
import { joinDisposers } from '@sand/kit'

export const onWake = (nudge: (online: boolean) => void, offline: () => void) => {
  const wake = () => nudge(false)
  const shown = () => {
    if (document.visibilityState === 'visible') wake()
  }
  return joinDisposers(
    listen(window, 'online', () => nudge(true)),
    listen(window, 'offline', offline),
    listen(window, 'focus', wake),
    listen(window, 'pageshow', wake),
    listen(document, 'visibilitychange', shown),
  )
}
