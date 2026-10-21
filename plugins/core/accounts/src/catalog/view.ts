import type { ModelInfo } from '../contract'
import { canonicalModel } from './match'
import { isKeyKind, keyLabels, signInError } from '../auth/kinds'
import { split, unknownModel } from './build'
import { cached } from './cached'
import { sourceInfo } from './sources'
import type { Entry } from './types'

export type View = ReturnType<typeof viewOf>

const noModel = 'No model chosen. Pick one in the model picker next to send, or set a default in Settings › Models.'

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

  const lookup = (id: string) => {
    const { ids, shown } = index.get()
    return ids.get(id) ?? shown.find(model => model.name === id)
  }

  const find = (id: string) => lookup(id) ?? lookup(canonicalModel(id))

  const resolve = (wanted?: string): ModelInfo | undefined => {
    if (!wanted) return undefined
    const id = canonicalModel(wanted)
    const found = find(wanted) ?? index.get().all.find(model => model.name === wanted || model.name === id)
    if (found) return found
    const parts = split(id)
    if (!parts) return undefined
    const owner = entry(parts.source)
    return owner && unknownModel(owner.meta, parts.name)
  }

  const missing = (id?: string) => {
    const source = id ? split(id)?.source : undefined
    if (source && isKeyKind(source)) return signInError(keyLabels[source])
    if (!index.get().entries.length) return signInError()
    return id ? new Error(`Unknown model "${id}"`) : new Error(noModel)
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
