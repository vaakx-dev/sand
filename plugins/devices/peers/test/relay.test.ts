import { type ViaRelay, viaTransport } from '@sand/devices-connect'
import { viaClose, viaFetch } from '@sand/devices-contract'
import type { Caller, WireEvent } from '@sand/host-hub/contract'
import { afterEach, expect, test } from 'bun:test'
import { forwardFetches } from '../src/forward/fetch'

const TIMEOUT_MS = 300
const GAP_MS = 100

let server: ReturnType<typeof Bun.serve> | undefined
let cancelled = false

afterEach(() => {
  server?.stop(true)
  cancelled = false
})

const chunks = (count: number, gapMs: (index: number) => number) => {
  const encoder = new TextEncoder()
  let sent = 0
  return new ReadableStream<Uint8Array>({
    async pull(out) {
      await Bun.sleep(gapMs(sent))
      out.enqueue(encoder.encode(`chunk ${sent++}\n`))
      if (sent === count) out.close()
    },
    cancel() {
      cancelled = true
    },
  })
}

const throughRelay = (body: () => ReadableStream<Uint8Array>) => {
  server = Bun.serve({ port: 0, idleTimeout: 0, fetch: () => new Response(body()) })
  const base = `http://127.0.0.1:${server.port}`
  const caller: Caller = { device: 'far-pc', kind: 'pc' }
  const listeners = new Set<(name: string, payload: unknown) => void>()
  const fetches = forwardFetches({ tell: (_, event, payload) => listeners.forEach(listener => listener(event.id, payload)) })
  const relay: ViaRelay = {
    async call(request, input) {
      if (request.id === viaFetch.id) return fetches.fetchHead(base, input as never, caller) as never
      if (request.id === viaClose.id) return fetches.close((input as { stream: string }).stream, caller) as never
      throw new Error(`unexpected ${request.id}`)
    },
    on<P>(event: WireEvent<P>, listener: (payload: P) => void) {
      const heard = (name: string, payload: unknown) => name === event.id && listener(payload as P)
      listeners.add(heard)
      return () => void listeners.delete(heard)
    },
  }
  return viaTransport(relay, 'target-pc')
}

const signedIn = { authorization: 'Bearer session' }

test('a reply through a relay PC streams past the timeout', async () => {
  const transport = throughRelay(() => chunks(8, () => GAP_MS))
  const response = await transport.fetch('/stream', { headers: signedIn, timeout: TIMEOUT_MS })
  const reader = response.body!.getReader()
  const first = await reader.read()
  expect(new TextDecoder().decode(first.value)).toBe('chunk 0\n')
  let rest = ''
  for (let read = await reader.read(); !read.done; read = await reader.read()) rest += new TextDecoder().decode(read.value)
  expect(rest.split('\n')).toHaveLength(8)
})

test('a reply through a relay PC that goes quiet fails and stops on the far PC', async () => {
  const transport = throughRelay(() => chunks(8, index => (index === 2 ? TIMEOUT_MS * 10 : GAP_MS)))
  const response = await transport.fetch('/stream', { headers: signedIn, timeout: TIMEOUT_MS })
  await expect(response.text()).rejects.toThrow(/went quiet/)
  await Bun.sleep(TIMEOUT_MS)
  expect(cancelled).toBe(true)
})

test('a relay PC only forwards requests that carry a session, besides pairing', async () => {
  const transport = throughRelay(() => chunks(1, () => 0))
  await expect(transport.fetch('/stream', { timeout: TIMEOUT_MS })).rejects.toThrow(/needs a session/)
})
