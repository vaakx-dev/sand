import type { Limits } from '@sand/llm-accounts/contract'
import type { Wire } from '@sand/web-client/contract'
import { usageQuery } from '@sand/kit'
import { clock, derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import { fleetLoader } from './data/fleet'
import type { History } from './data/forecast'
import { historyView } from './data/forecast/hours'
import { withLiveLimits } from './data/limits'
import { mergeSummaries } from './data/merge'
import { mergePeriods } from './data/merge/groups'
import { normalise } from './data/normalise'
import type { Pc, PcSummary } from './data/types'
import { allPcs, usagePrefs } from './prefs'
import type { Breakdown } from './view/breakdown/rows'

export interface UsageDeps {
  wire: Wire
  pcs(): Pc[]
  limits(): Limits[]
  refreshLimits(): Promise<void>
  openThread?(id: string): void
  copy(text: string, what: string): void
}

export interface Notice {
  pc: Pc
  at: number
  failure: string
}

const stale = 60_000

const outdated = (limits: Limits[]) => !limits.length || limits.some(found => Date.now() - found.updated > stale)

export const usageModel = (deps: UsageDeps) => {
  const { range, pc, tab } = usagePrefs()
  const signature = derive(() => JSON.stringify(deps.pcs()))
  const pcs = derive(() => {
    signature.get()
    return untrack(deps.pcs)
  })
  const fleet = fleetLoader(deps.wire, () => pcs.get(), () => ({ key: range.get(), query: usageQuery(range.get()) }))
  const history = fleetLoader(deps.wire, () => pcs.get(), historyView)
  const breakdown = sig<Breakdown>('projects')
  const checking = sig(false)
  const now = clock(30_000)
  const opened = sig(new Map<string, boolean>())
  const windows = sig(new Map<string, string>())

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
  const home = () => pcs.get().find(machine => machine.local)

  const selected = derive(() => {
    const list = pcs.get()
    const wanted = pc.get()
    return wanted !== allPcs && list.some(machine => machine.id === wanted) ? list.filter(machine => machine.id === wanted) : list
  })

  const partsOf = (loader: typeof fleet) =>
    derive(() => {
      const states = loader.states.get()
      return selected.get().flatMap((machine): PcSummary[] => {
        const summary = states.get(machine.id)?.summary
        return summary ? [{ pc: machine, summary: normalise(summary, machine, nameOf) }] : []
      })
    })

  const parts = partsOf(fleet)
  const historyParts = partsOf(history)

  const usage = derive(() => {
    const list = parts.get()
    if (!list.length) return undefined
    const merged = mergeSummaries(list)
    const self = home()
    const showsHome = selected.get().some(machine => machine.id === self?.id)
    return { ...merged, accounts: withLiveLimits(merged.accounts, deps.limits(), self, showsHome) }
  })

  const historyOf = derive((): History | undefined => {
    const list = historyParts.get()
    if (!list.length) return undefined
    return { since: Math.min(...list.map(part => part.summary.since)), periods: mergePeriods(list) }
  })

  const notices = derive(() => {
    const states = fleet.states.get()
    return selected.get().flatMap((machine): Notice[] => {
      const state = states.get(machine.id)
      if (machine.online && !state?.failure) return []
      return [{ pc: machine, at: state?.summary ? state.at : 0, failure: machine.online ? (state?.failure ?? '') : '' }]
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
    fleet.refresh()
    history.refresh()
  }

  if (outdated(untrack(deps.limits))) checkWith()

  return {
    range,
    pc,
    tab,
    breakdown,
    checking,
    now,
    usage,
    history: historyOf,
    notices,
    busy: fleet.busy,
    pcs,
    opened,
    windows,
    nameOf: (id: string) => nameOf(id) ?? id,
    refresh,
    checkLimits: () => checkWith(refresh),
    openThread: deps.openThread,
    copy: deps.copy,
    showOnly: (id: string) => pc.set(id),
    setOpen: (account: string, open: boolean) => opened.set(new Map(opened.get()).set(account, open)),
    setWindow: (account: string, window: string) => windows.set(new Map(windows.get()).set(account, window)),
  }
}

export type UsageModel = ReturnType<typeof usageModel>
