import type { ModelInfo } from '../contract'

const variant = /\[[^\]]*\]$/

const names = (models: ModelInfo[]) => [...new Set(models.map(model => model.label))].join(', ')

const bare = (model: ModelInfo) => (model.name ?? model.id).toLowerCase()

const oneModel = (models: ModelInfo[]) => new Set(models.map(bare)).size === 1 || new Set(models.map(model => model.label.toLowerCase())).size === 1

export const canonicalModel = (id: string) => id.replace(variant, '')

export const matchModel = (query: string, models: ModelInfo[], find?: (id: string) => ModelInfo | undefined) => {
  const known = find?.(query)
  if (known) return known.id
  const wanted = canonicalModel(query).toLowerCase()
  const exact = models.find(model => model.id.toLowerCase() === wanted) ?? models.find(model => bare(model) === wanted || model.label.toLowerCase() === wanted)
  if (exact) return exact.id
  const found = models.filter(model => model.id.toLowerCase().includes(wanted) || model.label.toLowerCase().includes(wanted))
  if (found.length && oneModel(found)) return found[0]!.id
  if (found.length > 1) throw new Error(`"${query}" matches ${names(found)}. Be more specific.`)
  throw new Error(`No model matches "${query}". Choose one of ${names(models)}.`)
}
