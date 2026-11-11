import { onWindow } from '@vaakx-dev/vrui'

const register = () =>
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(error => console.error('service worker', error))

export const registerWorker = () => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  onWindow(document.documentElement, 'load', register, { once: true })
}
