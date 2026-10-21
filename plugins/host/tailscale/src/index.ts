import { hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import { hostTailscale, tailscale as tailscaleService, tailscaleChange, tailscaleGet, tailscaleSet, type TailscaleState } from './contract'
import { createTailscale } from './service'

const pollEvery = 60_000

export default definePlugin({
  name: 'host-tailscale',
  description: 'Detects Tailscale and optionally serves sand over HTTPS on the tailnet with tailscale serve',
  inject: { hostOptions, hub },
  async apply(ctx) {
    let active = true
    const changed = (state: TailscaleState) => {
      if (!active) return
      ctx.emit(hostTailscale, state)
      ctx.hub.broadcast(tailscaleChange, state)
    }
    const { home, port } = ctx.hostOptions
    const tailscale = await createTailscale({ home, port, changed })
    ctx.effect(() => () => {
      active = false
    })
    ctx.effect(() => {
      const timer = setInterval(() => void tailscale.refresh(), pollEvery)
      return () => clearInterval(timer)
    })
    ctx.effect(() => ctx.hub.handle(tailscaleGet, () => tailscale.refresh()))
    ctx.effect(() => ctx.hub.handle(tailscaleSet, ({ https }) => tailscale.setHttps(https)))
    ctx.provide(tailscaleService, { state: tailscale.state, refresh: tailscale.refresh, setHttps: tailscale.setHttps })
    void tailscale.resume()
  },
})
