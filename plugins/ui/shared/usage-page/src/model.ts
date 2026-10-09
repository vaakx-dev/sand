import type { Limits } from '@sand/llm-accounts/contract'
import type { UsageSummary } from '@sand/usage/contract'
import type { Wire } from '@sand/web-client/contract'
import { clock, derive, effect, sig, untrack } from '@sand/dom'
import { periodLabel } from '@sand/kit'
import { summaryLoader } from './load'
import { usagePrefs } from './prefs'
import { periodKeys } from './range'
import type { Breakdown } from './view/spend/breakdown'
import type { ProviderLimits } from './view/limits'

export interface UsageDeps {
  wire: Wire
  limits(): Limits | undefined
  refreshLimits?(): Promise<void>
  openThread?(id: string): void
}

const windowLabel = (summary: UsageSummary) => {
  const keys = periodKeys(summary.since, summary.until, summary.bucket)
  return keys.length ? `${periodLabel(keys[0]!, summary.bucket)} to ${periodLabel(keys.at(-1)!, summary.bucket)}` : ''
}

const ownerOf = (live: Limits, providers: UsageSummary['providers']) =>
  live.provider ?? providers.find(provider => provider.billing === 'plan')?.id ?? providers[0]?.id

export const usageModel = (deps: UsageDeps) => {
  const { range, view } = usagePrefs()
  const breakdown = sig<Breakdown>('models')
  const loader = summaryLoader(deps.wire)
  const checking = sig(false)
  const now = clock(30_000)
  const reload = () => untrack(() => loader.load(range.get()))

  effect(() => {
    range.get()
    reload()
  })

  const checkLimits = () => {
    if (!deps.refreshLimits || checking.get()) return
    checking.set(true)
    void deps
      .refreshLimits()
      .then(reload)
      .finally(() => checking.set(false))
  }

  const providers = derive((): ProviderLimits[] => {
    const list = loader.summary.get()?.providers ?? []
    const live = deps.limits()
    const owner = live && ownerOf(live, list)
    return list.map((provider, order) => ({ ...provider, order, limits: provider.id === owner ? live : provider.limits }))
  })

  const caption = () => {
    const summary = loader.summary.get()
    return summary && view.get() !== 'limits' ? windowLabel(summary) : ''
  }

  return {
    range,
    view,
    breakdown,
    loader,
    now,
    providers,
    caption,
    busy: derive(() => (view.get() === 'limits' ? checking.get() : loader.busy.get())),
    refresh: () => (view.get() === 'limits' ? checkLimits() : reload()),
  }
}

export type UsageModel = ReturnType<typeof usageModel>
