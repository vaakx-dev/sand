import { safeEnv, safeFromEnv } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { createSupervisor } from './supervisor'

export default definePlugin({
  name: 'host-runtimes',
  description: 'Starts sand runtimes, swaps in fresh ones and restarts them when they crash',
  inject: ['hostOptions', 'hostApp'],
  apply(ctx) {
    const startSafe = safeFromEnv()
    delete process.env[safeEnv]
    const supervisor = createSupervisor(
      ctx.hostOptions,
      () => ctx.hostApp.main(),
      {
        runtimes: () => ctx.emit('host.runtimes'),
        event: event => ctx.emit('host.event', event),
        good: () => void ctx.hostVersions?.markGood().catch(() => {}),
        restore: () => ctx.hostVersions?.autoRestore() ?? Promise.resolve([]),
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
