import type { Limits } from '@sand/llm-accounts/contract'
import type { Wire } from '@sand/web-client/contract'
import { clock, derive, effect, sig, untrack } from '@sand/dom'
import { fleetLoader } from './data/fleet'
import { withLiveLimits } from './data/limits'
import { mergeSummaries } from './data/merge'
import { normalise } from './data/normalise'
import type { Pc, PcSummary } from './data/types'
import type { Metric } from './format'
import { allPcs, usagePrefs } from './prefs'
import type { Breakdown } from './view/breakdown/rows'

export interface UsageDeps {
  wire: Wire
  pcs(): Pc[]
  limits(): Limits[]
  refreshLimits?(): Promise<void>
  openThread?(id: string): void
}

export interface Notice {
  pc: Pc
  at: number
  failure: string
}

export const usageModel = (deps: UsageDeps) => {
  const { range, pc } = usagePrefs()
  const signature = derive(() => JSON.stringify(deps.pcs()))
  const pcs = derive(() => JSON.parse(signature.get()) as Pc[])
  const fleet = fleetLoader(deps.wire, () => pcs.get(), range)
  const metric = sig<Metric>('cost')
  const breakdown = sig<Breakdown>('projects')
  const checking = sig(false)
  const now = clock(30_000)

  effect(() => {
    range.get()
    untrack(fleet.load)
  })
  effect(() => {
    pcs.get()
    untrack(fleet.sync)
  })

  const nameOf = (id: string) => pcs.get().find(machine => machine.id === id)?.name
  const home = () => pcs.get().find(machine => machine.local)

  const selected = derive(() => {
    const list = pcs.get()
    const wanted = pc.get()
    return wanted !== allPcs && list.some(machine => machine.id === wanted) ? list.filter(machine => machine.id === wanted) : list
  })

  const parts = derive(() => {
    const states = fleet.states.get()
    return selected.get().flatMap((machine): PcSummary[] => {
      const summary = states.get(machine.id)?.summary
      return summary ? [{ pc: machine, summary: normalise(summary, machine, nameOf) }] : []
    })
  })

  const usage = derive(() => {
    const list = parts.get()
    if (!list.length) return undefined
    const merged = mergeSummaries(list)
    const self = home()
    const showsHome = selected.get().some(machine => machine.id === self?.id)
    return { ...merged, accounts: withLiveLimits(merged.accounts, deps.limits(), self, showsHome) }
  })

  const notices = derive(() => {
    const states = fleet.states.get()
    return selected.get().flatMap((machine): Notice[] => {
      const state = states.get(machine.id)
      if (machine.online && !state?.failure) return []
      return [{ pc: machine, at: state?.summary ? state.at : 0, failure: machine.online ? (state?.failure ?? '') : '' }]
    })
  })

  const checkLimits = () => {
    if (!deps.refreshLimits || checking.get()) return
    checking.set(true)
    void deps
      .refreshLimits()
      .then(fleet.refresh)
      .finally(() => checking.set(false))
  }

  return {
    range,
    pc,
    metric,
    breakdown,
    checking,
    now,
    usage,
    notices,
    busy: fleet.busy,
    pcs,
    nameOf: (id: string) => nameOf(id) ?? id,
    refresh: fleet.refresh,
    checkLimits: deps.refreshLimits ? checkLimits : undefined,
    openThread: deps.openThread,
  }
}

export type UsageModel = ReturnType<typeof usageModel>
