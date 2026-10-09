import type { TailscaleState } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { findTailscale } from './binary'
import { createTailscale } from './service'

const pollEvery = 60_000

export const tailscalePlugin = definePlugin({
  name: 'tailscale',
  description: 'Detects Tailscale and optionally serves sand over HTTPS on the tailnet with tailscale serve',
  inject: ['hostOptions', 'hub'],
  async apply(ctx) {
    let active = true
    const changed = (state: TailscaleState) => {
      if (!active) return
      ctx.emit('host.tailscale', state)
      ctx.hub.broadcast({ name: 'tailscale.change', args: [state] })
    }
    const { home, port } = ctx.hostOptions
    const tailscale = await createTailscale({ binary: findTailscale(), home, port, changed })
    ctx.effect(() => () => {
      active = false
    })
    ctx.effect(() => {
      const timer = setInterval(() => void tailscale.refresh(), pollEvery)
      return () => clearInterval(timer)
    })
    ctx.effect(() => ctx.hub.handle('tailscale.get', () => tailscale.refresh()))
    ctx.effect(() =>
      ctx.hub.handle('tailscale.set', ({ https }) => {
        if (typeof https !== 'boolean') throw new Error('tailscale.set needs https: true or false')
        return tailscale.setHttps(https)
      }),
    )
    ctx.provide('tailscale', { state: tailscale.state, refresh: tailscale.refresh, setHttps: tailscale.setHttps })
    void tailscale.resume()
  },
})
