import type { BuildInfo } from '@sand/host-dist/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import type { HostHealth, HostHealthCheck } from './contract'
import { serverLogTail } from './log'
import { probeWeb } from './web'

export const createHealthCheck = (runtimes: Runtimes, home: string, build: () => Promise<BuildInfo | undefined>): HostHealthCheck => {
  let running: Promise<HostHealth> | undefined

  const run = async (): Promise<HostHealth> => {
    const status = runtimes.status()
    const current = runtimes.current()
    const failedPlugins = [...(current?.failed ?? status.failed ?? [])]
    const [web, info, log] = await Promise.all([
      status.runtime === 'ready' ? probeWeb(current) : { ok: false, error: 'the runtime is not ready' },
      build().catch(() => undefined),
      serverLogTail(home),
    ])
    return {
      healthy: status.runtime === 'ready' && !failedPlugins.length && web.ok,
      runtime: status.runtime,
      ...(status.error ? { error: status.error } : {}),
      failedPlugins,
      web: web.ok,
      ...(web.error ? { webError: web.error } : {}),
      ...(info ? { build: info } : {}),
      log,
    }
  }

  return {
    check() {
      running ??= run().finally(() => {
        running = undefined
      })
      return running
    },
  }
}
