import type { ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import { derive, effect, sig, untrack } from '@sand/dom'
import type { Catalog } from './catalog'

export type Mode = 'shown' | 'all'

const step = 100

const matches = (model: ModelInfo, words: string[]) => {
  const text = `${model.label} ${model.name ?? model.id}`.toLowerCase()
  return words.every(word => text.includes(word))
}

export const createFilter = (source: SourceInfo, catalog: Catalog) => {
  const query = sig('')
  const mode = sig<Mode>(source.search && source.shown > 0 ? 'shown' : 'all')
  const limit = sig(step)
  const kept = sig(new Set<string>())

  const found = derive(() => {
    const models = catalog.models.get() ?? []
    const words = query.get().toLowerCase().split(/\s+/).filter(Boolean)
    const all = mode.get() === 'all'
    const keep = kept.get()
    return models.filter(model => (all || !model.hidden || keep.has(model.id)) && matches(model, words))
  })

  const rows = derive(() => found.get().slice(0, limit.get()))
  const more = derive(() => found.get().length - rows.get().length)

  effect(() => {
    query.get()
    mode.get()
    untrack(() => {
      limit.set(step)
      kept.set(new Set())
    })
  })

  return {
    query,
    mode,
    found,
    rows,
    more,
    keep: (id: string) => kept.update(set => new Set(set).add(id)),
    showMore: () => limit.update(value => value + step),
  }
}

export type Filter = ReturnType<typeof createFilter>
