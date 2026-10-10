import type { ModelInfo } from '../contract'
import { fixedLabels, isFixed, signInError } from '../auth/kinds'
import { modelOf, split } from './build'
import { sourceInfo } from './sources'
import type { Entry } from './types'

export type View = ReturnType<typeof viewOf>

const byShown = (a: ModelInfo, b: ModelInfo) => Number(!!a.hidden) - Number(!!b.hidden) || a.label.localeCompare(b.label)

export const viewOf = (entries: () => Entry[]) => {
  const all = () => entries().flatMap(entry => entry.models)
  const models = () => all().filter(model => !model.hidden)
  const entry = (source: string) => entries().find(found => found.meta.id === source)

  const find = (id: string) => {
    const known = all()
    return known.find(model => model.id === id) ?? known.find(model => !model.hidden && model.name === id)
  }

  const resolve = (id?: string): ModelInfo | undefined => {
    if (!id) return models()[0]
    const found = find(id) ?? all().find(model => model.name === id)
    if (found) return found
    const parts = split(id)
    const owner = parts && entry(parts.source)
    return owner && parts ? modelOf(owner.meta, { name: parts.name }) : undefined
  }

  const missing = (id?: string) => {
    const source = id ? split(id)?.source : undefined
    if (source && isFixed(source)) return signInError(fixedLabels[source])
    return id && entries().length ? new Error(`Unknown model "${id}"`) : signInError()
  }

  return {
    entries,
    entry,
    models,
    find,
    resolve,
    missing,
    sources: () => entries().map(sourceInfo),
    list: (source: string) => [...(entry(source)?.models ?? [])].sort(byShown),
  }
}
