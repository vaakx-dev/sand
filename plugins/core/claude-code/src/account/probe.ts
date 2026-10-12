import type { Effort, PlanLimits, PlanModel } from '@sand/llm-accounts/contract'
import { tmpdir } from 'node:os'
import { claudeArgs, claudeEnv } from '../cli/args'
import { connect, fieldsOf, type Connection, type Json } from '../cli/connection'
import { usageLimits } from './usage'

const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const probe = async <T>(work: (connection: Connection) => Promise<T>) => {
  const connection = await connect({ args: claudeArgs({}), env: claudeEnv(), cwd: tmpdir(), handle: async () => ({}), onMessage: () => {}, onExit: () => {} })
  try {
    return await work(connection)
  } finally {
    connection.close()
  }
}

const modelOf = (entry: Json): PlanModel[] => {
  const name = typeof entry.resolvedModel === 'string' && entry.resolvedModel ? entry.resolvedModel : entry.value
  if (typeof name !== 'string' || !name || entry.value === 'default') return []
  const levels = Array.isArray(entry.supportedEffortLevels) ? efforts.filter(effort => (entry.supportedEffortLevels as unknown[]).includes(effort)) : []
  return [{ name, ...(typeof entry.displayName === 'string' && { label: entry.displayName }), ...(levels.length && { efforts: levels }), images: true }]
}

export const listModels = () =>
  probe(async connection => {
    const { models } = await connection.request('initialize', {})
    const found = (Array.isArray(models) ? models : []).map(fieldsOf).flatMap(modelOf)
    return [...new Map(found.map(model => [model.name, model])).values()]
  })

export const readUsage = (): Promise<PlanLimits | undefined> =>
  probe(async connection => {
    await connection.request('initialize', {})
    return usageLimits(await connection.request('get_usage', { skip_behaviors: true }))
  })
