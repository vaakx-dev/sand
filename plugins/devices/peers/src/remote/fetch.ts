import { type CallOptions, peersRelayCancel, peersRelayFetch, viaMethods } from '@sand/devices-contract'
import type { HostChannel } from '@sand/host-runtimes/contract'
import { encodeBody, headerRecord } from '../encoding'
import type { Bodies } from './bodies'
import { hostWait, unwrap } from './outcome'

type ViaMethod = (typeof viaMethods)[number]

const methodOf = (init: RequestInit | undefined) => {
  const method = (init?.method ?? 'GET').toUpperCase()
  if (!(viaMethods as readonly string[]).includes(method)) throw new Error(`${method} requests can't be sent to another PC`)
  return method as ViaMethod
}

export const remoteFetch =
  (host: HostChannel, bodies: Bodies) =>
  async (pc: string, path: string, init?: RequestInit, options?: CallOptions): Promise<Response> => {
    const signal = init?.signal ?? undefined
    signal?.throwIfAborted()
    const stream = crypto.randomUUID()
    const cancel = () => void host.call(peersRelayCancel, { stream }).catch(() => {})
    const body = bodies.create(stream, cancel)
    const aborted = () => {
      cancel()
      bodies.fail(stream, signal?.reason)
    }
    signal?.addEventListener('abort', aborted, { once: true })
    try {
      const input = { pc, stream, path, method: methodOf(init), headers: headerRecord(init?.headers), body: await encodeBody(init?.body), timeout: options?.timeout }
      const head = unwrap(await host.call(peersRelayFetch, input, hostWait(options?.timeout)))
      if (!head.streamed) bodies.drop(stream)
      return new Response(head.streamed ? body : null, { status: head.status, headers: head.headers })
    } catch (error) {
      signal?.removeEventListener('abort', aborted)
      bodies.drop(stream)
      throw signal?.aborted ? signal.reason : error
    }
  }
