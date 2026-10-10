import { colorsOf } from '../../data/providers'
import type { Account, Merged } from '../../data/types'
import { valueOf, type Metric } from '../../format'
import { isSubscription } from '../../names'
import { periodKeys } from '../../range'

export interface Series {
  account: Account
  label: string
  color: string
  dashed: boolean
  values: number[]
  total: number
}

const labelsOf = (accounts: Account[]) => {
  const counts = new Map<string, number>()
  for (const account of accounts) counts.set(account.label, (counts.get(account.label) ?? 0) + 1)
  return (account: Account) => ((counts.get(account.label) ?? 0) > 1 && account.pcName ? `${account.label} · ${account.pcName}` : account.label)
}

export const seriesOf = (usage: Merged, metric: Metric) => {
  const keys = periodKeys(usage.since, usage.until, usage.bucket)
  const byKey = new Map(usage.periods.map(period => [period.key, period]))
  const used = usage.accounts.filter(account => account.turns)
  const labelOf = labelsOf(used)
  const colorOf = colorsOf(usage.accounts)
  const series: Series[] = used.map(account => {
    const values = keys.map(key => valueOf(byKey.get(key)?.accounts[account.key], metric))
    return {
      account,
      label: labelOf(account),
      color: colorOf(account.provider),
      dashed: !isSubscription(account),
      values,
      total: values.reduce((sum, value) => sum + value, 0),
    }
  })
  return { keys, series: series.sort((a, b) => b.total - a.total) }
}
