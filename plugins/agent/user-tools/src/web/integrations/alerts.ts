import { listen } from '@vaakx-dev/vrui'

export type AlertAccess = NotificationPermission | 'unsupported'

export interface Alert {
  title: string
  body: string
  tag: string
  session: string
  url: string
}

const supported = () => window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator

export const alertAccess = (): AlertAccess => (supported() ? Notification.permission : 'unsupported')

export const requestAlerts = async () => {
  await Notification.requestPermission()
  return alertAccess()
}

export const pageVisible = () => document.visibilityState === 'visible'

export const showAlert = async ({ title, body, tag, session, url }: Alert) => {
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, { body, tag, icon: '/icons/192x192.png', data: { session, url } })
}

const openedSession = (data: unknown) =>
  typeof data === 'object' && data !== null && 'open' in data && typeof data.open === 'string' ? data.open : undefined

export const onAlertOpen = (open: (session: string) => void) =>
  supported()
    ? listen<MessageEvent>(navigator.serviceWorker, 'message', event => {
        const session = openedSession(event.data)
        if (session) open(session)
      })
    : () => {}
