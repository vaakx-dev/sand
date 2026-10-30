import type { Daemon } from '@sand/host-daemon/contract'
import { dim, done } from '@sand/host-dist/setup'
import { hostHealthRequest, type HostHealth } from '@sand/host-health/contract'
import { healthText, waitHealthy } from '@sand/util/boot'
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

export const waitForHealth = async (daemon: Daemon, home: string) => {
  dim('Waiting for sand to be ready…')
  const read = () => daemon.request(hostHealthRequest, {}, { timeout: 10_000 })
  const outcome = await waitHealthy(read, { timeout: 180_000 })
  if (outcome.ok) return done('Sand is ready')
  const details = healthText(outcome)
  const summary = outcome.error ? `${unhealthy}: ${outcome.error}` : unhealthy
  throw new UnhealthyError(`${unhealthy}:\n${details}\nFull log: ${join(home, 'server.log')}`, summary, outcome.report)
}
