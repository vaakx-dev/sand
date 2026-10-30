import { tailscale, tailscaleChange, tailscaleGet, tailscaleSet, type TailscaleState, tailscaleState } from '@sand/devices-contract'
import type { hostOptions } from '@sand/host-daemon/contract'
import type { hub } from '@sand/host-hub/contract'
import type { Context } from 'drydock'
import { createTailscale } from './service'

const pollEvery = 60_000

type TailscaleContext = Context<{ hostOptions: typeof hostOptions; hub: typeof hub }>

export const startTailscale = async (ctx: TailscaleContext, changed: (state: TailscaleState) => void) => {
  let active = true
  const { home, port } = ctx.hostOptions
  const runner = await createTailscale({
    home,
    port,
    changed: state => {
      if (!active) return
      ctx.emit(tailscaleState, state)
      ctx.hub.broadcast(tailscaleChange, state, 'user')
      changed(state)
    },
  })
  ctx.effect(() => () => {
    active = false
  })
  ctx.effect(() => {
    const timer = setInterval(() => void runner.refresh(), pollEvery)
    return () => clearInterval(timer)
  })
  ctx.effect(() => ctx.hub.handle(tailscaleGet, () => runner.refresh()))
  ctx.effect(() => ctx.hub.handle(tailscaleSet, ({ https }) => runner.setHttps(https)))
  ctx.provide(tailscale, { state: runner.state, refresh: runner.refresh, setHttps: runner.setHttps, peers: runner.peers })
  void runner.resume()
  return runner
}
