import type { Limits, SourceInfo } from '@sand/accounts/contract'
import type { Wire } from '@sand/devices-contract'
import type { UsageHistory } from '@sand/usage/contract'
import { clock, derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import { fleetLoader, historyView, summaryView } from './data/fleet'
import { mergeSummaries } from './data/merge'
import { mergeHistory } from './data/merge/groups'
import { normaliseHistory } from './data/normalise'
import { gaugesOf } from './data/gauges'
import { plansOf } from './data/pool'
import { priceLoader, unpricedModels } from './data/prices'
import { repricedSummary } from './data/reprice'
import type { Pc } from './data/types'
import { allPcs, usagePrefs } from './prefs'

export interface UsageDeps {
  wire: Wire
  pcs(): Pc[]
  limits(): Limits[]
  sources(): SourceInfo[]
  refreshLimits(): Promise<void>
}

export interface Notice {
  pc: Pc
  at: number
  failure: string
}

const stale = 60_000

const outdated = (limits: Limits[]) => !limits.length || limits.some(found => Date.now() - found.updated > stale)

export const usageModel = (deps: UsageDeps) => {
  const { range, pc, forecast } = usagePrefs()
  const signature = derive(() => JSON.stringify(deps.pcs()))
  const pcs = derive(() => {
    signature.get()
    return untrack(deps.pcs)
  })
  const fleet = fleetLoader(deps.wire, () => pcs.get(), () => summaryView(range.get()))
  const history = fleetLoader(deps.wire, () => pcs.get(), () => historyView)
  const checking = sig(false)
  const now = clock(30_000)

  effect(() => {
    range.get()
    untrack(fleet.load)
  })
  effect(() => {
    pcs.get()
    untrack(fleet.sync)
    untrack(history.sync)
  })

  const nameOf = (id: string) => pcs.get().find(machine => machine.id === id)?.name
  const home = derive(() => pcs.get().find(machine => machine.home))

  const selected = derive(() => {
    const list = pcs.get()
    const wanted = pc.get()
    return wanted !== allPcs && list.some(machine => machine.id === wanted) ? list.filter(machine => machine.id === wanted) : list
  })

  const parts = derive(() => {
    const states = fleet.states.get()
    return selected.get().flatMap(machine => {
      const summary = states.get(machine.id)?.summary
      return summary ? [{ pc: machine, summary }] : []
    })
  })

  const histories = derive(() => {
    const states = history.states.get()
    return new Map(
      pcs.get().flatMap((machine): [string, UsageHistory][] => {
        const found = states.get(machine.id)?.summary
        return found ? [[machine.id, normaliseHistory(found, machine, nameOf)]] : []
      }),
    )
  })

  const reloads = sig(0)
  const unpriced = derive(() => unpricedModels(parts.get().map(({ summary }) => summary)))
  const { prices, failure: priceFailure } = priceLoader(deps.wire, () => unpriced.get(), () => reloads.get())

  const usage = derive(() => {
    const list = parts.get().map(({ pc, summary }) => ({ pc, summary: repricedSummary(summary, prices.get()) }))
    return list.length ? mergeSummaries(list) : undefined
  })

  const merged = derive(() => {
    const list = [...histories.get().values()]
    return list.length ? mergeHistory(list) : undefined
  })

  const plans = derive(() => {
    const self = home.get()
    const own = self && histories.get().get(self.id)
    return self && own ? plansOf({ accounts: own.accounts, live: deps.limits(), sources: deps.sources(), home: self.id }) : []
  })

  const gauges = derive(() => gaugesOf(plans.get(), merged.get(), now.get()))

  const notices = derive(() => {
    const states = fleet.states.get()
    return selected.get().flatMap((machine): Notice[] => {
      const state = states.get(machine.id)
      const failure = state?.failure || (machine.home ? priceFailure.get() : '')
      if (machine.online && !failure) return []
      return [{ pc: machine, at: state?.summary ? state.at : 0, failure: machine.online ? failure : '' }]
    })
  })

  const checkWith = (after?: () => void) => {
    if (checking.get()) return
    checking.set(true)
    void deps
      .refreshLimits()
      .then(after)
      .finally(() => checking.set(false))
  }

  const refresh = () => {
    reloads.set(reloads.get() + 1)
    fleet.refresh()
    history.refresh()
  }

  const homeOnline = derive(() => !!home.get()?.online)
  effect(() => {
    if (homeOnline.get() && outdated(untrack(deps.limits))) untrack(() => checkWith())
  })

  return {
    range,
    pc,
    forecast,
    checking,
    now,
    usage,
    plans,
    gauges,
    notices,
    busy: fleet.busy,
    pcs,
    reload: () => checkWith(refresh),
  }
}

export type UsageModel = ReturnType<typeof usageModel>
