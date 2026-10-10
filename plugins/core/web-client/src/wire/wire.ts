import type { Hello } from '@sand/protocol'
import type { ConnectionInfo, Wire, WireState } from '../contract'
import type { Context } from 'drydock'
import { pairFragment } from '../auth/fragment'
import { createHostAuth } from '../auth/host'
import { hostKeys } from '../auth/keys'
import { homeHost, setHomeHost } from '../connection/book'
import type { HelloKeep } from '../connection/hello'
import { createPcConnection, type PcConnection } from '../connection/pc'

export interface HomeWire extends Wire {
  info(): ConnectionInfo
  nudge(): void
}

export const startWire = (
  ctx: Context,
  changed: () => void,
  since: () => string | undefined,
  gate: (host: string) => Promise<void>,
  kept: HelloKeep,
): HomeWire => {
  const fragment = pairFragment()
  let pc: PcConnection | undefined
  let hello: Hello | undefined
  let state: WireState = 'connecting'
  const auth = createHostAuth({
    base: () => pc?.base() ?? location.origin,
    offer() {
      const secret = fragment.take()
      return secret ? { secret } : undefined
    },
    paired: () => fragment.clear(),
  })
  const home = createPcConnection({
    seeds: () => [location.origin],
    expected: homeHost,
    trusted: () => location.origin,
    ticket: (base, host) => gate(host).then(() => auth.socketUrl(base, host)),
    offline: 'Not connected to the sand server',
    event: event => ctx.emit('wire.event', event),
    since,
    hello(next) {
      hello = next
      ctx.emit('wire.hello', next)
    },
    changed() {
      if (!pc) return
      const next = pc.state()
      if (next !== state) {
        state = next
        ctx.emit('wire.state', next)
      }
      changed()
    },
    identified: setHomeHost,
    kept,
  })
  pc = home
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
    retryAt: () => home.info().retryAt,
    reconnect: home.nudge,
    hello: () => hello,
    pairing: auth.pairing,
    call: request => home.call(request),
    fetch: (path, init) => auth.fetch(path, init),
    info: home.info,
    nudge: home.nudge,
  }
}
