export const registerWorker = () => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(error => console.error('service worker', error))
}
