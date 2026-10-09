import type { BuildInfo, HostHealth, HostHealthCheck, Runtimes, RuntimeView } from '@sand/protocol'

export interface HealthOptions {
  runtimes: Pick<Runtimes, 'status' | 'current'>
  probe(runtime: RuntimeView | undefined): Promise<{ ok: boolean; error?: string }>
  log(): Promise<string[]>
  build(): Promise<BuildInfo | undefined>
}

export const createHealthCheck = (options: HealthOptions): HostHealthCheck => {
  let running: Promise<HostHealth> | undefined

  const run = async (): Promise<HostHealth> => {
    const status = options.runtimes.status()
    const current = options.runtimes.current()
    const failedPlugins = [...(current?.failed ?? status.failed ?? [])]
    const [web, build, log] = await Promise.all([
      status.runtime === 'ready' ? options.probe(current) : { ok: false, error: 'the runtime is not ready' },
      options.build().catch(() => undefined),
      options.log().catch(() => []),
    ])
    return {
      healthy: status.runtime === 'ready' && !failedPlugins.length && web.ok,
      runtime: status.runtime,
      ...(status.error ? { error: status.error } : {}),
      failedPlugins,
      web: web.ok,
      ...(web.error ? { webError: web.error } : {}),
      ...(build ? { build } : {}),
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
