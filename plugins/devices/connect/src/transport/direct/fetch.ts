import type { TransportInit } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { isTimeout, TimedOut } from '../../errors/timed-out'
import { Unreachable } from '../../errors/unreachable'
import { seconds } from '../../time/seconds'

type StreamingInit = RequestInit & { duplex?: 'half' }

const signalOf = (init: TransportInit) => {
  const timeout = AbortSignal.timeout(init.timeout)
  return init.signal ? AbortSignal.any([timeout, init.signal]) : timeout
}

const requestInit = (init: TransportInit): StreamingInit => ({
  method: init.method ?? 'GET',
  headers: init.headers,
  body: init.body,
  signal: signalOf(init),
  ...(init.body instanceof ReadableStream && { duplex: 'half' }),
})

export const fetchDirect = async (base: string, path: string, init: TransportInit) => {
  try {
    return await fetch(new URL(path, base), requestInit(init))
  } catch (error) {
    if (init.signal?.aborted) throw init.signal.reason
    if (isTimeout(error)) throw new TimedOut(`${base} didn't answer within ${seconds(init.timeout)}`)
    throw new Unreachable(`couldn't reach ${base}: ${errorMessage(error)}`)
  }
}
