import { errorMessage } from '@sand/kit'
import { safeEnv, safeFromEnv } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { createSupervisor } from './supervisor'

export default definePlugin({
  name: 'host-runtimes',
  description: 'Starts sand runtimes, swaps in fresh ones and restarts them when they crash',
  inject: ['hostOptions', 'hostApp'],
  uses: {
    hostVersions: 'a runtime that fails to start does not bring back the last working plugins',
    hub: 'safe mode cannot be switched from the web UI',
  },
  apply(ctx) {
    const startSafe = safeFromEnv()
    delete process.env[safeEnv]
    const supervisor = createSupervisor(
      ctx.hostOptions,
      () => ctx.hostApp.main(),
      {
        runtimes: () => ctx.emit('host.runtimes'),
        event: event => ctx.emit('host.event', event),
        good: () => void ctx.hostVersions?.markGood().catch(error => console.error(`could not remember the working plugins: ${errorMessage(error)}`)),
        restore: async () => (await ctx.hostVersions?.autoRestore()) ?? [],
      },
      startSafe,
    )
    ctx.provide('runtimes', supervisor.runtimes)
    ctx.watch('hub', hub => hub?.handle('runtimes.safe', ({ on }) => supervisor.safe(on)))
    ctx.effect(() => {
      supervisor.start()
      return supervisor.stop
    })
  },
})
