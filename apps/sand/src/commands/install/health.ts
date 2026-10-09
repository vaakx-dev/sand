import type { HostHealth, ServerInfo } from '@sand/protocol'
import { join } from 'node:path'
import { askHealth } from '../../host/updates/health/ask'
import { healthText } from '../../host/updates/health/check'
import { waitHealthy } from '../../host/updates/health/wait'
import { dim, done } from './print'

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

export const waitForHealth = async (info: Pick<ServerInfo, 'url' | 'key'>, home: string) => {
  dim('Waiting for sand to be ready…')
  const outcome = await waitHealthy(() => askHealth(info), { timeout: 180_000 })
  if (outcome.ok) return done('Sand is ready')
  const details = healthText(outcome)
  const summary = outcome.error ? `${unhealthy}: ${outcome.error}` : unhealthy
  throw new UnhealthyError(`${unhealthy}:\n${details}\nFull log: ${join(home, 'server.log')}`, summary, outcome.report)
}
