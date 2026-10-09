export const onWake = (nudge: (online: boolean) => void, offline: () => void) => {
  const wake = () => nudge(false)
  const online = () => nudge(true)
  const visible = () => {
    if (document.visibilityState === 'visible') nudge(false)
  }
  addEventListener('online', online)
  addEventListener('offline', offline)
  addEventListener('focus', wake)
  addEventListener('pageshow', wake)
  document.addEventListener('visibilitychange', visible)
  return () => {
    removeEventListener('online', online)
    removeEventListener('offline', offline)
    removeEventListener('focus', wake)
    removeEventListener('pageshow', wake)
    document.removeEventListener('visibilitychange', visible)
  }
}
