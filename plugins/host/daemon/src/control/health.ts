import type { ServerInfo } from '@sand/host-gateway/contract'
import { hostHealthRequest } from '@sand/host-health/contract'
import { waitHealthy } from '@sand/util/boot'
import { ask } from './ask'

const healthWait = 120_000

export const checkHealth = (home: string, info: ServerInfo) =>
  waitHealthy(() => ask(home, info, hostHealthRequest, {}, 10_000), { timeout: healthWait })
