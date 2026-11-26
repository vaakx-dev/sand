import { afterAll, expect, jest, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { attach } from '../src'

interface Request {
  id: number
  method: string
}

const server = Bun.serve({
  port: 0,
  fetch: (request, server) => (server.upgrade(request) ? undefined : new Response('no upgrade', { status: 400 })),
  websocket: {
    message(socket, data) {
      const { id, method }: Request = JSON.parse(String(data))
      if (method === 'Browser.getVersion') socket.send(JSON.stringify({ id, result: { product: 'Test/1.0' } }))
    },
  },
})

const profile = mkdtempSync(join(tmpdir(), 'sand-cdp-session-'))
await Bun.write(join(profile, 'DevToolsActivePort'), `${server.port}\n/devtools/browser/test`)

afterAll(async () => {
  await server.stop(true)
  await rm(profile, { recursive: true, force: true })
})

test('gives up on a call the browser never answers and keeps serving the next one', async () => {
  const browser = await attach(profile, Date.now() + 5_000)
  jest.useFakeTimers()
  const stuck = browser.call('Input.dispatchMouseEvent', { type: 'mouseWheel' })
  jest.advanceTimersByTime(60_000)
  jest.useRealTimers()
  await expect(stuck).rejects.toThrow('The browser did not answer Input.dispatchMouseEvent')
  expect(await browser.call<{ product: string }>('Browser.getVersion')).toEqual({ product: 'Test/1.0' })
  await browser.close()
})
