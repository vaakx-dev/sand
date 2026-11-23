import type { PlanLimits } from '@sand/accounts/contract'
import { tmpdir } from 'node:os'
import { claudeArgs, claudeCatalogEnv, claudeEnv } from '../cli/args'
import { connect, type Connection } from '../cli/connection'
import { usageLimits } from './usage'

const probeWith = async <T>(env: Record<string, string>, work: (connection: Connection) => Promise<T>) => {
  const connection = await connect({ args: claudeArgs({}), env, cwd: tmpdir(), handle: async () => ({}), onMessage: () => {}, onExit: () => {} })
  try {
    return await work(connection)
  } finally {
    void connection.close()
  }
}

export const probe = <T>(config: string | undefined, work: (connection: Connection) => Promise<T>) => probeWith(claudeEnv(config), work)

export const probeCatalog = <T>(config: string | undefined, work: (connection: Connection) => Promise<T>) => probeWith(claudeCatalogEnv(config), work)

export const readUsage = (config?: string): Promise<PlanLimits | undefined> =>
  probe(config, async connection => {
    await connection.request('initialize', {})
    return usageLimits(await connection.request('get_usage', { skip_behaviors: true }))
  })
