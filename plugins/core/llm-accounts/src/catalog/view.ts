import type { ModelInfo } from '../contract'
import { fixedLabels, isFixed, signInError } from '../auth/kinds'
import { modelOf, split } from './build'
import { cached } from './cached'
import { sourceInfo } from './sources'
import type { Entry } from './types'

export type View = ReturnType<typeof viewOf>

const byShown = (a: ModelInfo, b: ModelInfo) => Number(!!a.hidden) - Number(!!b.hidden) || a.label.localeCompare(b.label)

const firstBy = <T>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, T>()
  for (const item of items) if (!map.has(key(item))) map.set(key(item), item)
  return map
}

const indexOf = (entries: Entry[]) => {
  const all = entries.flatMap(entry => entry.models)
  const shown = all.filter(model => !model.hidden)
  const ids = firstBy(all, model => model.id)
  const sources = firstBy(entries, entry => entry.meta.id)
  return { entries, all, shown, ids, sources }
}

export const viewOf = (entries: () => Entry[]) => {
  const index = cached(() => indexOf(entries()))
  const models = () => [...index.get().shown]
  const entry = (source: string) => index.get().sources.get(source)

  const find = (id: string) => {
    const { ids, shown } = index.get()
    return ids.get(id) ?? shown.find(model => model.name === id)
  }

  const resolve = (id?: string): ModelInfo | undefined => {
    if (!id) return index.get().shown[0]
    const found = find(id) ?? index.get().all.find(model => model.name === id)
    if (found) return found
    const parts = split(id)
    const owner = parts && entry(parts.source)
    return owner && parts ? modelOf(owner.meta, { name: parts.name }) : undefined
  }

  const missing = (id?: string) => {
    const source = id ? split(id)?.source : undefined
    if (source && isFixed(source)) return signInError(fixedLabels[source])
    return id && index.get().entries.length ? new Error(`Unknown model "${id}"`) : signInError()
  }

  return {
    entries: () => index.get().entries,
    entry,
    models,
    find,
    resolve,
    missing,
    reset: index.reset,
    sources: () => index.get().entries.map(sourceInfo),
    list: (source: string) => [...(entry(source)?.models ?? [])].sort(byShown),
  }
}
