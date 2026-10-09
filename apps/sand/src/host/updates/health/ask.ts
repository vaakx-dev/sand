import type { ServerInfo } from '@sand/protocol'
import { ask } from '../../../daemon/ask'
import type { HealthReport } from './types'

export const askHealth = (info: Pick<ServerInfo, 'url' | 'key'>) => ask<HealthReport>(info, { type: 'host.health' }, 10_000)
