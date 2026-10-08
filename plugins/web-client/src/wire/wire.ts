import type { Hello, Wire } from '@sand/protocol'
import { socketUrl } from '@sand/kit'
import type { Context } from 'drydock'
import { backoff, reconnecting } from './reconnecting'

export const startWire = (ctx: Context): Wire => {
  const token = new URLSearchParams(location.search).get('token') ?? ''
  let hello: Hello | undefined
  const link = reconnecting({
    url: socketUrl(location.origin, token),
    offline: 'Not connected to the sand server',
    backoff: backoff(1000, 8000),
    event: event => ctx.emit('wire.event', event),
    hello(next) {
      hello = next
      ctx.emit('wire.hello', next)
    },
    state: next => ctx.emit('wire.state', next),
  })
  ctx.effect(() => () => link.close())

  return {
    token,
    state: link.state,
    retryAt: link.retryAt,
    reconnect: link.reconnect,
    hello: () => hello,
    call: request => link.call(request),
  }
}
