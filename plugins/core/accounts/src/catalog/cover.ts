import { canonicalModel, isMetered, type ModelInfo } from '../contract'
import type { Entry, SourceMeta } from './types'

export type Plans = Map<string, ModelInfo>

const keyOf = (meta: SourceMeta, model: ModelInfo) => {
  const name = canonicalModel(model.name ?? model.id).toLowerCase()
  const parts = name.split('/')
  const vendor = parts.length > 1 ? parts[0] : meta.provider
  const base = parts.at(-1)!.replace(/:.*$/, '').replace(/-\d{8}$/, '').replaceAll('.', '-')
  return `${vendor}:${base}`
}

export const runsOnPlan = (model: ModelInfo) => !!model.coveredBy && !model.paid

export const plansOf = (entries: Entry[]): Plans => {
  const plans: Plans = new Map()
  for (const { meta, models } of entries) {
    if (meta.billing !== 'plan') continue
    for (const model of models) {
      const key = keyOf(meta, model)
      if (!plans.has(key)) plans.set(key, model)
    }
  }
  return plans
}

export const coverOf = (plans: Plans, meta: SourceMeta, model: ModelInfo) => (isMetered(meta.billing) ? plans.get(keyOf(meta, model)) : undefined)

export const covered = (entries: Entry[], plans: Plans): Entry[] =>
  entries.map(entry => {
    if (!isMetered(entry.meta.billing)) return entry
    const models = entry.models.map(model => {
      const plan = coverOf(plans, entry.meta, model)
      return plan ? { ...model, coveredBy: plan.id } : model
    })
    return { ...entry, models }
  })
