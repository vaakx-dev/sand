import type { Pairing } from '@sand/protocol'

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const length = 8
const ttl = 10 * 60_000
const path = /^\/p\/([a-z0-9]+)\/?$/i

const expired = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>sand</title>
<body style="font:16px system-ui;background:#111;color:#ddd;padding:24px;line-height:1.5">
<p>This pairing link has expired or was already used.</p>
<p>Open <b>Connect a device</b> in sand, or run <code>sand devices</code>, for a new one.</p></body>`

export const createPairing = (token: string, used: (code: string) => void) => {
  const codes = new Map<string, number>()

  const sweep = (now: number) => {
    for (const [code, until] of codes) if (until <= now) codes.delete(code)
  }

  const issue = (): Pairing => {
    sweep(Date.now())
    const code = Array.from(crypto.getRandomValues(new Uint8Array(length)), byte => alphabet[byte & 31]).join('')
    codes.set(code, Date.now() + ttl)
    return { code, ttl }
  }

  const redeem = (url: URL) => {
    const code = path.exec(url.pathname)?.[1]?.toUpperCase()
    if (!code) return undefined
    const until = codes.get(code)
    codes.delete(code)
    if (!until || until <= Date.now()) return new Response(expired, { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } })
    used(code)
    return new Response(null, { status: 302, headers: { location: `/?token=${encodeURIComponent(token)}`, 'cache-control': 'no-store' } })
  }

  return { issue, redeem }
}
