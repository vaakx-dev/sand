import type { Hello } from '@sand/protocol'
import type { ConnectionInfo, Wire, WireState } from '../contract'
import type { Context } from 'drydock'
import { pairFragment } from '../auth/fragment'
import { createHostAuth } from '../auth/host'
import { hostKeys } from '../auth/keys'
import type { Cache } from '../cache/service'
import { createPcConnection } from '../connection/pc'
import { coalesced } from '../detached'

export interface HomeWire extends Wire {
  info(): ConnectionInfo
}

export const startWire = (ctx: Context, cache: Cache, here: string, since: () => string | undefined): HomeWire => {
  const fragment = pairFragment()
  const machinesChanged = coalesced(ctx, () => ctx.emit('machines.change'))
  let hello: Hello | undefined
  let state: WireState = 'connecting'
  const auth = createHostAuth({
    base: () => home.base() ?? location.origin,
    offer() {
      const secret = fragment.take()
      return secret ? { secret } : undefined
    },
    paired: () => fragment.clear(),
  })
  const home = createPcConnection({
    seeds: () => [location.origin],
    expected: () => here,
    trusted: () => location.origin,
    ticket: (base, host) => cache.gate(host).then(() => auth.socketUrl(base, host)),
    offline: 'Not connected to the sand server',
    event: event => ctx.emit('wire.event', event),
    since,
    hello(next) {
      hello = next
      ctx.emit('wire.hello', next)
    },
    changed() {
      const next = home.state()
      if (next !== state) {
        state = next
        ctx.emit('wire.state', next)
      }
      machinesChanged()
    },
    kept: { load: () => cache.saved('hello'), save: saved => cache.keep('hello', saved) },
  })
  ctx.effect(() => () => home.close())
  ctx.effect(() =>
    fragment.watch(() => {
      if (home.state() === 'open') fragment.clear()
      else home.nudge()
    }),
  )
  ctx.effect(() =>
    hostKeys.watch(() => {
      if (home.state() === 'unpaired') home.nudge()
    }),
  )

  return {
    state: home.state,
    hello: () => hello,
    pairing: auth.pairing,
    call: home.call,
    fetch: auth.fetch,
    info: home.info,
  }
}
