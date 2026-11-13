import { safeEnv } from '@sand/boot'
import { cli } from '@sand/config/contract'
import { hostApp, hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { hostVersions } from '@sand/host-plugin-versions/contract'
import { errorMessage, joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { hostEvent, hostRuntimes, runtimeChanged, runtimeFailed, runtimes, runtimesReload, runtimesSafe, runtimesSwapped } from './contract'
import { answerRuntime } from './answer'
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
        asked: async (runtime, call) => {
          await ctx.settled()
          return answerRuntime(ctx.get(hub), runtime, call)
        },
      },
      startSafe,
    )
    ctx.provide(runtimes, supervisor.runtimes)
    const reload = async () => {
      const swapped = await supervisor.runtimes.swap('reload')
      return supervisor.runtimes.swapped() ?? { swapped, failed: [] }
    }
    ctx.watch(
      hub,
      impl =>
        impl &&
        joinDisposers(
          impl.handle(runtimesSafe, ({ on }) => supervisor.safe(on)),
          impl.handle(runtimesReload, reload),
          impl.handle(runtimesSwapped, () => supervisor.runtimes.swapped()),
        ),
    )
    ctx.effect(() => {
      supervisor.start()
      return supervisor.stop
    })
  },
})
