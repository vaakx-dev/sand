import type { RuntimeView } from '@sand/host-runtimes/contract'
import { afterEach, expect, test } from 'bun:test'
import { probeWeb } from '../src/web'

let server: ReturnType<typeof Bun.serve> | undefined

afterEach(() => server?.stop(true))

const runtimeServing = (page: string): RuntimeView => {
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch: request => {
      const { pathname } = new URL(request.url)
      if (pathname === '/') return new Response(page, { headers: { 'content-type': 'text/html' } })
      if (pathname === '/assets/app.js') return new Response('export {}')
      return new Response('Not found', { status: 404 })
    },
  })
  return { id: 'r', pid: 1, url: server.url.href, secret: 's', state: 'ready', activity: { sessions: [] }, failed: [] }
}

test('the app script is found whatever attributes its tag carries', async () => {
  const runtime = runtimeServing('<head><script type="module" blocking="render" src="/assets/app.js"></script></head>')
  expect(await probeWeb(runtime)).toEqual({ ok: true })
})

test('a page without a module script fails', async () => {
  const runtime = runtimeServing('<head><script src="/assets/app.js"></script></head>')
  expect(await probeWeb(runtime)).toEqual({ ok: false, error: 'the web page does not load the app' })
})
