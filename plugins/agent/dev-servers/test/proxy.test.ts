import { afterEach, expect, test } from 'bun:test'
import { request } from 'node:http'
import { createPasses } from '../src/host/passes'
import { createProxy, type Proxy } from '../src/host/proxy'
import { createRelay } from '../src/host/relay'

let upstream: ReturnType<typeof Bun.serve>
let proxy: Proxy

afterEach(() => {
  proxy.stop()
  void upstream.stop(true)
})

const startUpstream = () =>
  Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request, server) {
      const url = new URL(request.url)
      if (url.pathname === '/hmr') return server.upgrade(request, { headers: { 'sec-websocket-protocol': 'vite-hmr' } }) ? undefined : new Response('no', { status: 400 })
      if (url.pathname === '/login') return new Response(null, { status: 302, headers: { location: `http://localhost:${server.port}/welcome`, 'set-cookie': 'tide=high; Domain=localhost; Path=/' } })
      return new Response(`<!doctype html><title>Tide tables</title><p>${request.headers.get('host')}</p>`, { headers: { 'content-type': 'text/html' } })
    },
    websocket: { message: (socket, message) => void socket.send(`echo ${message}`) },
  })

const ZERO_MASK = [0, 0, 0, 0]

const textFrame = (text: string) => Buffer.from([0x81, 0x80 | text.length, ...ZERO_MASK, ...Buffer.from(text)])

const socketReply = (port: number, cookie: string) =>
  new Promise<{ protocol: string; reply: string }>((resolve, reject) => {
    const handshake = request({
      host: '127.0.0.1',
      port,
      path: '/hmr',
      headers: { connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-version': '13', 'sec-websocket-key': 'dGlkZS10YWJsZXMtdGVzdA==', 'sec-websocket-protocol': 'vite-hmr', cookie },
    })
    handshake.on('upgrade', (response, socket) => {
      socket.once('data', (frame: Buffer) => {
        resolve({ protocol: String(response.headers['sec-websocket-protocol']), reply: frame.subarray(2).toString() })
        socket.destroy()
      })
      socket.write(textFrame('ping'))
    })
    handshake.on('response', response => reject(new Error(`the proxy answered ${response.statusCode}`)))
    handshake.on('error', reject)
    handshake.end()
  })

test('only a device with a link reaches the dev server, and pages, redirects, cookies and hot reload sockets work through it', async () => {
  upstream = startUpstream()
  const passes = createPasses()
  proxy = createProxy({ upstream: { port: upstream.port!, address: '127.0.0.1' }, passes, hostnames: ['127.0.0.1'] })
  const base = `http://127.0.0.1:${proxy.port}`
  const link = base + proxy.path(passes.ticket('phone', upstream.port!))

  expect((await fetch(`${base}/`)).status).toBe(401)

  const opened = await fetch(link, { redirect: 'manual' })
  expect(opened.status).toBe(303)
  expect((await fetch(link, { redirect: 'manual' })).status).toBe(403)
  const cookie = opened.headers.get('set-cookie')!.split(';')[0]!

  const page = await fetch(`${base}/`, { headers: { cookie } })
  expect(await page.text()).toContain(`<p>localhost:${upstream.port}</p>`)

  const login = await fetch(`${base}/login`, { headers: { cookie }, redirect: 'manual' })
  expect(login.headers.get('location')).toBe('/welcome')
  expect(login.headers.get('set-cookie')).toBe('tide=high; Path=/')

  expect(await socketReply(proxy.port, cookie)).toEqual({ protocol: 'vite-hmr', reply: 'echo ping' })
})

test('a PC the device reaches through another one relays the page and its hot reload socket, and still needs the link', async () => {
  upstream = startUpstream()
  const passes = createPasses()
  proxy = createProxy({ upstream: { port: upstream.port!, address: '127.0.0.1' }, passes, hostnames: ['127.0.0.1'] })
  const relay = createRelay({ hostname: '127.0.0.1', port: proxy.port }, ['127.0.0.1'], () => {})
  const base = `http://127.0.0.1:${relay.port}`

  expect((await fetch(`${base}/`)).status).toBe(401)
  const opened = await fetch(base + proxy.path(passes.ticket('phone', upstream.port!)), { redirect: 'manual' })
  const cookie = opened.headers.get('set-cookie')!.split(';')[0]!
  const page = await fetch(`${base}/`, { headers: { cookie } })
  expect(await page.text()).toContain('<title>Tide tables</title>')
  expect(await socketReply(relay.port, cookie)).toEqual({ protocol: 'vite-hmr', reply: 'echo ping' })
  relay.stop()
})
