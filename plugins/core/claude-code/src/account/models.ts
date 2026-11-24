import type { PlanModel } from '@sand/accounts/contract'
import { fieldsOf, levelsOf, textOf, type Json } from '@sand/app-plan'
import { probeCatalog } from './probe'

const variant = /\[[^\]]*\]$/

interface Offered {
  model: PlanModel
  cli: string
}

const offeredOf = (entry: Json): Offered[] => {
  const cli = textOf(entry.resolvedModel) ?? textOf(entry.value)
  if (!cli || entry.value === 'default') return []
  const name = cli.replace(variant, '')
  const levels = levelsOf(Array.isArray(entry.supportedEffortLevels) ? entry.supportedEffortLevels : [])
  return [{ model: { name, label: textOf(entry.displayName) ?? name, ...levels, images: true }, cli }]
}

const byVariantLast = (a: Offered, b: Offered) => Number(variant.test(a.cli)) - Number(variant.test(b.cli))

const offered = (config?: string) =>
  probeCatalog(config, async connection => {
    const { models } = await connection.request('initialize', {})
    const found = (Array.isArray(models) ? models : []).map(fieldsOf).flatMap(offeredOf).sort(byVariantLast)
    return [...new Map(found.map(item => [item.model.name, item])).values()]
  })

export const modelCatalog = (config?: string) => {
  let cliNames = new Map<string, string>()
  let loading: Promise<PlanModel[]> | undefined

  const list = async () => {
    const found = await offered(config)
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
