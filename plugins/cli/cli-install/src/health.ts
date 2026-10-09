import type { HostHealth } from '@sand/host-health/contract'
import { dim, done, healthText, waitHealthy } from '@sand/kit/host'
import type { Daemon, ServerInfo } from '@sand/protocol'
import { join } from 'node:path'

const unhealthy = 'Sand started, but it is not healthy'

export class UnhealthyError extends Error {
  constructor(
    message: string,
    readonly summary: string,
    readonly health?: HostHealth,
  ) {
    super(message)
  }
}

export const waitForHealth = async (daemon: Daemon, info: Pick<ServerInfo, 'url' | 'key'>, home: string) => {
  dim('Waiting for sand to be ready…')
  const read = () => daemon.request<HostHealth>({ type: 'host.health' }, { to: info, timeout: 10_000 })
  const outcome = await waitHealthy(read, { timeout: 180_000 })
  if (outcome.ok) return done('Sand is ready')
  const details = healthText(outcome)
  const summary = outcome.error ? `${unhealthy}: ${outcome.error}` : unhealthy
  throw new UnhealthyError(`${unhealthy}:\n${details}\nFull log: ${join(home, 'server.log')}`, summary, outcome.report)
}
