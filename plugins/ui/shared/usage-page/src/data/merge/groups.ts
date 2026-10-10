import type { ModelUsage, PeriodUsage, UnpricedModel } from '@sand/usage/contract'
import { addRecord, addTotals, byCost, emptyTotals, grouped } from '../totals'
import type { PcSummary } from '../types'

export const mergeModels = (parts: PcSummary[]) => {
  const byKey = new Map<string, ModelUsage>()
  for (const { summary } of parts)
    for (const model of summary.models)
      addTotals(
        grouped(byKey, `${model.account}\n${model.name}`, () => ({ ...model, ...emptyTotals() })),
        model,
      )
  return [...byKey.values()].sort(byCost)
}

export const mergePeriods = (parts: PcSummary[]) => {
  const byKey = new Map<string, PeriodUsage>()
  for (const { summary } of parts)
    for (const period of summary.periods) {
      const into = grouped(byKey, period.key, (): PeriodUsage => ({ ...emptyTotals(), key: period.key, accounts: {} }))
      addTotals(into, period)
      for (const [key, totals] of Object.entries(period.accounts)) addRecord(into.accounts, key, totals)
    }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export const mergeUnpriced = (parts: PcSummary[]) => {
  const byModel = new Map<string, UnpricedModel>()
  for (const { summary } of parts)
    for (const item of summary.unpriced) {
      const into = grouped(byModel, item.model, () => ({ model: item.model, turns: 0, tokens: 0 }))
      into.turns += item.turns
      into.tokens += item.tokens
    }
  return [...byModel.values()].sort((a, b) => b.tokens - a.tokens)
}
