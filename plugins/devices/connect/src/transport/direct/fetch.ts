import type { TransportInit } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { TimedOut } from '../../errors/timed-out'
import { Unreachable } from '../../errors/unreachable'
import { seconds } from '../../time/seconds'
import { quietLimit, watchedBody } from '../quiet'

type StreamingInit = RequestInit & { duplex?: 'half' }

const requestInit = (init: TransportInit, quiet: AbortSignal): StreamingInit => ({
  method: init.method ?? 'GET',
  headers: init.headers,
  body: init.body,
  signal: init.signal ? AbortSignal.any([quiet, init.signal]) : quiet,
  ...(init.body instanceof ReadableStream && { duplex: 'half' }),
})

export const fetchDirect = async (base: string, path: string, init: TransportInit) => {
  const quiet = quietLimit(init.timeout, () => new TimedOut(`${base} went quiet for ${seconds(init.timeout)}`))
  quiet.start()
  try {
    return watchedBody(await fetch(new URL(path, base), requestInit(init, quiet.signal)), quiet)
  } catch (error) {
    quiet.stop()
    if (init.signal?.aborted) throw init.signal.reason
    if (quiet.signal.aborted) throw new TimedOut(`${base} didn't answer within ${seconds(init.timeout)}`)
    throw new Unreachable(`couldn't reach ${base}: ${errorMessage(error)}`)
  }
}
