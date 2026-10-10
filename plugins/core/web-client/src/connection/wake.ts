import { collectScope, disposeAll, listen } from '@sand/dom'

export const onWake = (nudge: (online: boolean) => void, offline: () => void) => {
  const wake = () => nudge(false)
  const visible = () => {
    if (document.visibilityState === 'visible') nudge(false)
  }
  const { scope } = collectScope(() => {
    listen(window, 'online', () => nudge(true))
    listen(window, 'offline', offline)
    listen(window, 'focus', wake)
    listen(window, 'pageshow', wake)
    listen(document, 'visibilitychange', visible)
  })
  return () => disposeAll(scope)
}
