import { grouped } from '@sand/util'
import type { ModelInfo } from '../contract'
import { qualify, unknownModel } from './build'
import type { Entry, SourceMeta } from './types'

interface PoolOptions {
  label(kind: string): string
  entry(meta: SourceMeta, models: ModelInfo[]): Entry
}

export interface Pooled {
  entries: Entry[]
  accounts: Entry[]
  members(model: ModelInfo): ModelInfo[]
}

const onPlan = (entry: Entry) => entry.meta.billing === 'plan'

const nameOf = (model: ModelInfo) => model.name ?? model.id

const poolMeta = (kind: string, group: Entry[], label: string): SourceMeta => {
  const lead = group.find(entry => entry.meta.id === kind) ?? group[0]!
  const { via: _, pc: __, online: ___, ...meta } = lead.meta
  return { ...meta, id: kind, label, online: group.some(entry => entry.meta.online !== false) }
}

const poolModels = (kind: string, group: Entry[]) => {
  const byName = new Map<string, ModelInfo>()
  for (const model of group.flatMap(entry => entry.models)) {
    const name = nameOf(model)
    if (byName.has(name)) continue
    const { via: _, source: __, ...rest } = model
    byName.set(name, { ...rest, id: qualify(kind, name), source: kind, name })
  }
  return [...byName.values()]
}

export const poolEntries = (entries: Entry[], { label, entry }: PoolOptions): Pooled => {
  const groups = new Map<string, Entry[]>()
  for (const found of entries.filter(onPlan)) grouped(groups, found.meta.kind, (): Entry[] => []).push(found)
  const pools = [...groups].map(([kind, group]) => entry(poolMeta(kind, group, label(kind)), poolModels(kind, group)))
  const members = (model: ModelInfo) => {
    const group = model.source ? groups.get(model.source) : undefined
    if (!group || !model.name) return []
    return group.map(account => account.models.find(found => found.name === model.name) ?? unknownModel(account.meta, model.name!))
  }
  return { entries: [...pools, ...entries.filter(found => !onPlan(found))], accounts: entries, members }
}
