import type { Effort, PlanModel } from '@sand/llm-accounts/contract'
import { fieldsOf, type Json } from '../cli/connection'
import { probe } from './probe'

const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const variant = /\[[^\]]*\]$/

interface Offered {
  model: PlanModel
  cli: string
}

const offeredOf = (entry: Json): Offered[] => {
  const cli = typeof entry.resolvedModel === 'string' && entry.resolvedModel ? entry.resolvedModel : entry.value
  if (typeof cli !== 'string' || !cli || entry.value === 'default') return []
  const levels = Array.isArray(entry.supportedEffortLevels) ? efforts.filter(effort => (entry.supportedEffortLevels as unknown[]).includes(effort)) : []
  const model: PlanModel = { name: cli.replace(variant, ''), ...(levels.length && { efforts: levels }), images: true }
  return [{ model, cli }]
}

const byVariantLast = (a: Offered, b: Offered) => Number(variant.test(a.cli)) - Number(variant.test(b.cli))

const offered = () =>
  probe(async connection => {
    const { models } = await connection.request('initialize', {})
    const found = (Array.isArray(models) ? models : []).map(fieldsOf).flatMap(offeredOf).sort(byVariantLast)
    return [...new Map(found.map(item => [item.model.name, item])).values()]
  })

export const modelCatalog = () => {
  let cliNames = new Map<string, string>()
  let loading: Promise<PlanModel[]> | undefined

  const list = async () => {
    const found = await offered()
    cliNames = new Map(found.map(({ model, cli }) => [model.name, cli]))
    return found.map(({ model }) => model)
  }

  return {
    list,
    async cliName(name: string) {
      if (!cliNames.size) await (loading ??= list().finally(() => (loading = undefined)))
      return cliNames.get(name) ?? name
    },
  }
}
