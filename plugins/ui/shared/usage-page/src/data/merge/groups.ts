import { addTotals, byCost, emptyTotals, type History, type HourUsage, type ModelUsage, type UnpricedModel, type UsageHistory } from '@sand/usage/contract'
import { grouped } from '@sand/util'
import { addRecord, addSpend } from '../totals'
import type { PcSummary, PeriodModels } from '../types'

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
  const byKey = new Map<string, PeriodModels>()
  for (const { summary } of parts)
    for (const period of summary.periods) {
      const into = grouped(byKey, period.key, (): PeriodModels => ({ key: period.key, models: {} }))
      for (const [name, totals] of Object.entries(period.models)) addRecord(into.models, name, totals)
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

export const mergeHistory = (parts: UsageHistory[]): History => {
  const byKey = new Map<string, HourUsage>()
  for (const { periods } of parts)
    for (const period of periods) {
      const into = grouped(byKey, period.key, (): HourUsage => ({ key: period.key, accounts: {} }))
      for (const [account, spend] of Object.entries(period.accounts)) into.accounts[account] = addSpend(into.accounts[account], spend)
    }
  return { since: Math.min(...parts.map(part => part.since)), periods: [...byKey.values()] }
}
