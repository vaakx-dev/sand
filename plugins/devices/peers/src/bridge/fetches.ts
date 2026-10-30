import { type Peers, peersChunk, type peersRelayFetch, type RelayChunk, type RelayHead } from '@sand/devices-contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/util'
import { bodylessStatuses, decodeBody, encodeBytes, replyHeaders } from '../encoding'
import { relayed } from './outcome'

type FetchInput = InputOf<typeof peersRelayFetch>

export const relayFetches = (peers: Peers, runtimes: () => Runtimes | undefined) => {
  const active = new Map<string, AbortController>()

  const keyOf = (runtime: string, stream: string) => `${runtime} ${stream}`

  const send = (runtime: string, chunk: RelayChunk) => runtimes()?.tell(runtime, peersChunk, chunk) ?? false

  const pump = async (runtime: string, stream: string, body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return void send(runtime, { stream, done: true })
        if (!send(runtime, { stream, data: encodeBytes(value) })) return void (await reader.cancel())
      }
    } catch (error) {
      send(runtime, { stream, error: errorMessage(error) })
    } finally {
      active.delete(keyOf(runtime, stream))
    }
  }

  const fetchHead = async ({ pc, stream, path, method, headers, body, timeout }: FetchInput, runtime: string): Promise<RelayHead> => {
    const key = keyOf(runtime, stream)
    const controller = new AbortController()
    active.set(key, controller)
    try {
      const response = await peers.fetch(pc, path, { method, headers, body: decodeBody(body), signal: controller.signal }, { timeout })
      const streamed = bodylessStatuses.has(response.status) ? null : response.body
      if (streamed) void pump(runtime, stream, streamed)
      else active.delete(key)
      return { status: response.status, headers: replyHeaders(response.headers), streamed: streamed !== null }
    } catch (error) {
      active.delete(key)
      throw error
    }
  }

  return {
    open: (input: FetchInput, runtime: string) => relayed(() => fetchHead(input, runtime)),
    cancel(stream: string, runtime: string) {
      active.get(keyOf(runtime, stream))?.abort()
    },
    close() {
      for (const controller of active.values()) controller.abort()
      active.clear()
    },
  }
}
