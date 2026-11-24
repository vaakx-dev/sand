import { canonicalModel, type ModelInfo, namedModel, providerMissing } from '../contract'
import { signInError } from '../auth/kinds'
import { qualify, split, unknownModel } from './build'
import { cached } from './cached'
import { sourceInfo } from './sources'
import type { Entry } from './types'

export type View = ReturnType<typeof viewOf>

interface ViewOptions {
  entries: () => Entry[]
  accounts: () => Entry[]
  label: (source: string) => string
}

const noModel = 'No model chosen. Pick one in the model picker next to send, or set a default in Settings › Models.'

const byShown = (a: ModelInfo, b: ModelInfo) => Number(!!a.hidden) - Number(!!b.hidden) || a.label.localeCompare(b.label)

const firstBy = <T>(items: T[], key: (item: T) => string) => {
  const map = new Map<string, T>()
  for (const item of items) if (!map.has(key(item))) map.set(key(item), item)
  return map
}

const indexOf = (entries: Entry[], accounts: Entry[]) => {
  const all = entries.flatMap(entry => entry.models)
  const shown = all.filter(model => !model.hidden)
  const ids = firstBy(all, model => model.id)
  const sources = firstBy(entries, entry => entry.meta.id)
  const kinds = new Map(accounts.filter(account => account.meta.billing === 'plan').map(account => [account.meta.id, account.meta.kind]))
  return { entries, all, shown, ids, sources, kinds }
}

export const viewOf = ({ entries, accounts, label }: ViewOptions) => {
  const index = cached(() => indexOf(entries(), accounts()))
  const models = () => [...index.get().shown]
  const entry = (source: string) => index.get().sources.get(source)

  const billing = (source: string) => entry(source)?.meta.billing

  const named = (models: ModelInfo[], name: string) => namedModel(models, name, { billing })

  const lookup = (id: string) => {
    const { ids, shown } = index.get()
    return ids.get(id) ?? named(shown, id)
  }

  const pooled = (id: string) => {
    const parts = split(canonicalModel(id))
    const kind = parts && index.get().kinds.get(parts.source)
    return kind && kind !== parts.source ? lookup(qualify(kind, parts.name)) : undefined
  }

  const find = (id: string) => lookup(id) ?? lookup(canonicalModel(id)) ?? pooled(id)

  const resolve = (wanted?: string): ModelInfo | undefined => {
    if (!wanted) return undefined
    const id = canonicalModel(wanted)
    const found = find(wanted) ?? named(index.get().all, wanted) ?? named(index.get().all, id)
    if (found) return found
    const parts = split(id)
    if (!parts) return undefined
    const owner = entry(parts.source)
    return owner && unknownModel(owner.meta, parts.name)
  }

  const missing = (id?: string) => {
    const source = id ? split(id)?.source : undefined
    if (id && source && !entry(source)) return providerMissing(id, label(source))
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
