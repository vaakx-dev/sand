import type { Context } from 'drydock'
import { type ConnectionInfo, machinesChange, type WirePairing, type WireState, wireHello, wireState } from '../contract'
import { pairFragment } from '../auth/fragment'
import { createHostAuth } from '../auth/host'
import { hostKeys } from '../auth/keys'
import type { Cache } from '../cache/service'
import { createPcConnection } from '../connection/pc'
import { coalesced } from '../detached'
import type { Call } from '../integrations/socket'
import type { Hellos } from './hellos'
import type { Listeners } from './listeners'

export interface HomeWire {
  state(): WireState
  pairing(): WirePairing | undefined
  call: Call
  fetch(path: string, init?: RequestInit): Promise<Response>
  info(): ConnectionInfo
}

interface HomeParts {
  cache: Cache
  here: string
  since(): string | undefined
  listeners: Listeners
  hellos: Hellos
}

export const startWire = (ctx: Context, { cache, here, since, listeners, hellos }: HomeParts): HomeWire => {
  const fragment = pairFragment()
  const machinesChanged = coalesced(ctx, () => ctx.emit(machinesChange))
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
    event: heard => listeners.dispatch(heard, here, false),
    since,
    hello(values) {
      hellos.set(here, values)
      ctx.emit(wireHello)
    },
    changed() {
      const next = home.state()
      if (next !== state) {
        state = next
        ctx.emit(wireState, next)
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
    pairing: auth.pairing,
    call: home.call,
    fetch: auth.fetch,
    info: home.info,
  }
}
