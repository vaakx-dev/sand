import { afterEach, expect, test } from 'bun:test'
import { fetchDirect } from '../src/transport/direct/fetch'

const TIMEOUT_MS = 300
const GAP_MS = 100

let server: ReturnType<typeof Bun.serve> | undefined

afterEach(() => server?.stop(true))

const chunks = (count: number, gapMs: (index: number) => number) => {
  const encoder = new TextEncoder()
  let sent = 0
  return new ReadableStream<Uint8Array>({
    async pull(out) {
      await Bun.sleep(gapMs(sent))
      out.enqueue(encoder.encode(`chunk ${sent++}\n`))
      if (sent === count) out.close()
    },
  })
}

const serve = (body: () => ReadableStream<Uint8Array>) => {
  server = Bun.serve({ port: 0, idleTimeout: 0, fetch: () => new Response(body()) })
  return `http://127.0.0.1:${server.port}`
}

test('an answer that keeps streaming runs past the timeout', async () => {
  const base = serve(() => chunks(8, () => GAP_MS))
  const response = await fetchDirect(base, '/', { timeout: TIMEOUT_MS })
  expect((await response.text()).split('\n')).toHaveLength(9)
})

test('an answer that goes quiet for longer than the timeout fails', async () => {
  const base = serve(() => chunks(8, index => (index === 2 ? TIMEOUT_MS * 4 : GAP_MS)))
  const response = await fetchDirect(base, '/', { timeout: TIMEOUT_MS })
  await expect(response.text()).rejects.toThrow(/went quiet/)
})
