import { cli } from '@sand/config/contract'
import { hostApp, hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { hostVersions } from '@sand/host-plugin-versions/contract'
import { errorMessage } from '@sand/util'
import { safeEnv } from '@sand/util/boot'
import { definePlugin } from 'drydock'
import { hostEvent, hostRuntimes, runtimeChanged, runtimeFailed, runtimes, runtimesSafe } from './contract'
import { createSupervisor } from './supervisor'

export default definePlugin({
  name: 'host-runtimes',
  description: 'Starts sand runtimes, swaps in fresh ones and restarts them when they crash',
  inject: { cli, hostOptions, hostApp },
  apply(ctx) {
    const startSafe = ctx.cli.safe
    delete process.env[safeEnv]
    const supervisor = createSupervisor(
      ctx.hostOptions,
      () => ctx.hostApp.main(),
      {
        runtimes: () => ctx.emit(hostRuntimes),
        changed: change => ctx.emit(hostEvent, runtimeChanged, change),
        failed: error => ctx.emit(hostEvent, runtimeFailed, error),
        good: () => void ctx.get(hostVersions)?.markGood().catch(error => console.error(`could not remember the working plugins: ${errorMessage(error)}`)),
        restore: async () => (await ctx.get(hostVersions)?.autoRestore()) ?? [],
      },
      startSafe,
    )
    ctx.provide(runtimes, supervisor.runtimes)
    ctx.watch(hub, impl => impl?.handle(runtimesSafe, ({ on }) => supervisor.safe(on)))
    ctx.effect(() => {
      supervisor.start()
      return supervisor.stop
    })
  },
})
