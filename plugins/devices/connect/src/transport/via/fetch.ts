import { type RelayChunk, type TransportInit, viaChunk, viaFetch } from '@sand/devices-contract'
import { untilAborted } from '@sand/util'
import { TimedOut } from '../../errors/timed-out'
import { seconds } from '../../time/seconds'
import { quietLimit, watchedBody } from '../quiet'
import type { ViaRelay } from './relay'
import { viaMethodOf, viaRequestOf } from './request'
import { fedBody } from './response'

const askHead = async (relay: ViaRelay, pc: string, path: string, init: TransportInit) => {
  const method = viaMethodOf(init)
  const { headers, body } = await viaRequestOf(init)
  const asked = relay.call(viaFetch, { pc, path, method, headers, ...(body && { body }) }, { timeout: init.timeout })
  return init.signal ? untilAborted(asked, init.signal) : asked
}

export const fetchVia = async (relay: ViaRelay, pc: string, path: string, init: TransportInit) => {
  const early: RelayChunk[] = []
  let take = (chunk: RelayChunk): void => void early.push(chunk)
  const stop = relay.on(viaChunk, chunk => take(chunk))
  const head = await askHead(relay, pc, path, init).catch((error: unknown) => {
    stop()
    throw error
  })
  const { stream, ...reply } = head
  if (!stream) {
    stop()
    return new Response(null, reply)
  }
  const fed = fedBody({ relay, stream, stop })
  take = fed.take
  early.forEach(fed.take)
  const quiet = quietLimit(init.timeout, () => new TimedOut(`${pc} went quiet for ${seconds(init.timeout)}`))
  quiet.signal.addEventListener('abort', () => fed.fail(quiet.signal.reason), { once: true })
  init.signal?.addEventListener('abort', () => fed.fail(init.signal?.reason), { once: true })
  return watchedBody(new Response(fed.readable, reply), quiet)
}
