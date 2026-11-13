import type { Runtimes, RuntimeView } from '@sand/host-runtimes/contract'
import type { ServerWebSocket } from 'bun'
import { expect, test } from 'bun:test'
import { type HubSocket, hubResync } from '../src/contract'
import { createHub } from '../src/hub'

const until = async (done: () => boolean) => {
  for (const start = Date.now(); !done(); await Bun.sleep(10)) if (Date.now() - start > 5000) throw new Error('timed out')
}

test('a runtime link that drops and comes back tells the page to resync, and only then', async () => {
  const links: ServerWebSocket[] = []
  const server = Bun.serve({
    port: 0,
    fetch: (request, served) => (served.upgrade(request) ? undefined : new Response('websocket only', { status: 400 })),
    websocket: { open: link => void links.push(link), message() {} },
  })
  const runtime: RuntimeView = {
    id: 'runtime',
    pid: 1,
    url: `http://127.0.0.1:${server.port}`,
    secret: 'secret',
    state: 'ready',
    activity: { sessions: [] },
    failed: [],
  }
  const runtimes: Runtimes = {
    current: () => runtime,
    live: () => [runtime],
    wait: async () => runtime,
    swap: async () => false,
    swapped: () => undefined,
    status: () => {
      throw new Error('not used')
    },
    tell: () => false,
  }
  const { hub, dispose } = createHub(runtimes, () => {})
  const frames: string[] = []
  const page: HubSocket = {
    send: raw => frames.push(raw),
    close() {},
    terminate() {},
  }

  hub.open(page, { device: 'phone', kind: 'phone' })
  await until(() => links.length === 1)
  links[0]!.close()
  await until(() => frames.length > 0)

  expect(links).toHaveLength(2)
  expect(frames.map(raw => JSON.parse(raw).name)).toEqual([hubResync.id])
  dispose()
  void server.stop(true)
})
