import type { Billing, ModelInfo } from './models'

const variant = /\[[^\]]*\]$/

const names = (models: ModelInfo[]) => [...new Set(models.map(model => model.label))].join(', ')

const bare = (model: ModelInfo) => (model.name ?? model.id).toLowerCase()

const oneModel = (models: ModelInfo[]) => new Set(models.map(bare)).size === 1 || new Set(models.map(model => model.label.toLowerCase())).size === 1

export const canonicalModel = (id: string) => id.replace(variant, '')

export const modelSource = (model: ModelInfo) => model.source ?? (model.id.includes('/') ? model.id.slice(0, model.id.indexOf('/')) : undefined)

export interface MatchOptions {
  find?: (id: string) => ModelInfo | undefined
  prefer?: string
  billing?: (source: string) => Billing | undefined
}

export const sourceBilling = (llm?: { sources?(): { id: string; billing: Billing }[] }) => (source: string) => llm?.sources?.().find(info => info.id === source)?.billing

const paid = new Set<Billing | undefined>(['api', 'credits'])

export const rankSources = (models: ModelInfo[], { prefer, billing }: MatchOptions = {}) => {
  const rank = (model: ModelInfo) => {
    const source = modelSource(model)
    if (prefer && source === prefer) return 0
    return source && paid.has(billing?.(source)) ? 2 : 1
  }
  return models.map((model, at) => ({ model, at, rank: rank(model) })).sort((a, b) => a.rank - b.rank || a.at - b.at).map(({ model }) => model)
}

export const matchModel = (query: string, models: ModelInfo[], options: MatchOptions = {}) => {
  const known = options.find?.(query)
  if (known && query.includes('/')) return known.id
  const wanted = canonicalModel(query).toLowerCase()
  const exact = models.find(model => model.id.toLowerCase() === wanted)
  if (exact) return exact.id
  const named = models.filter(model => bare(model) === wanted || model.label.toLowerCase() === wanted)
  if (named.length) return rankSources(named, options)[0]!.id
  if (known) return known.id
  const found = models.filter(model => model.id.toLowerCase().includes(wanted) || model.label.toLowerCase().includes(wanted))
  if (found.length && oneModel(found)) return rankSources(found, options)[0]!.id
  if (found.length > 1) throw new Error(`"${query}" matches ${names(found)}. Be more specific.`)
  throw new Error(`No model matches "${query}". Choose one of ${names(models)}.`)
}
