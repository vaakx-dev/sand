import { showPage } from './protocol'

const policy = [
  "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
  "frame-ancestors 'self'",
  'sandbox allow-scripts',
].join('; ')

const page = `<!doctype html><meta charset="utf-8"><meta name="color-scheme" content="dark"><script>
addEventListener('message', function show(event) {
  const message = event.data
  if (event.source !== window.parent || message?.method !== ${JSON.stringify(showPage)} || typeof message.params?.html !== 'string') return
  removeEventListener('message', show)
  document.open()
  document.write(message.params.html)
  document.close()
})
</script>`

export const hostRoute = () =>
  new Response(page, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': policy,
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-cache',
    },
  })
