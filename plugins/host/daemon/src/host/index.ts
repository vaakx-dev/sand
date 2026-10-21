import { cli, sandConfig } from '@sand/config/contract'
import { loadIdentity } from '@sand/util/boot'
import { definePlugin } from 'drydock'
import { hostApp, hostOptions, hostRestart, hostStop } from '../contract'
import { createHostApp } from './app'
import { restartHost } from './restart'
import { hostSettings } from './settings'

export default definePlugin({
  name: 'host-daemon',
  description: 'Reads the [host] settings, and stops or restarts the host when asked, going back to the previous build if the new one is unhealthy',
  inject: { cli, sandConfig },
  async apply(ctx) {
    const { home, exit } = ctx.cli
    const { port, name, watch, drainTimeout } = hostSettings(ctx.sandConfig)
    const main = Bun.main
    ctx.provide(hostOptions, { home, main, port, watch, drainTimeout, device: await loadIdentity(home, name) })
    ctx.provide(hostApp, createHostApp(main))

    ctx.on(hostStop, () => exit(0))
    ctx.on(hostRestart, () => exit(0, () => restartHost(home)))
    ctx.effect(() => {
      const stop = () => exit(0)
      process.on('SIGINT', stop)
      process.on('SIGTERM', stop)
      return () => {
        process.off('SIGINT', stop)
        process.off('SIGTERM', stop)
      }
    })
  },
})
