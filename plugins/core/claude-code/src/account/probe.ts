import type { PlanLimits } from '@sand/accounts/contract'
import { tmpdir } from 'node:os'
import { claudeArgs, claudeEnv } from '../cli/args'
import { connect, type Connection } from '../cli/connection'
import { usageLimits } from './usage'

export const probe = async <T>(work: (connection: Connection) => Promise<T>) => {
  const connection = await connect({ args: claudeArgs({}), env: claudeEnv(), cwd: tmpdir(), handle: async () => ({}), onMessage: () => {}, onExit: () => {} })
  try {
    return await work(connection)
  } finally {
    connection.close()
  }
}

export const readUsage = (): Promise<PlanLimits | undefined> =>
  probe(async connection => {
    await connection.request('initialize', {})
    return usageLimits(await connection.request('get_usage', { skip_behaviors: true }))
  })
