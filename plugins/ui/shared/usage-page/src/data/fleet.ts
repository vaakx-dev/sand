import { historyQuery, usageHistory, type UsageHistory, usageQuery, type UsageRange, usageSummary, type UsageSummary } from '@sand/usage/contract'
import type { Wire } from '@sand/devices-contract'
import { unanswered } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import { readCache, writeCache, type Cached } from '../integrations/cache'
import type { PageOrigin } from '../prefs'
import type { Pc } from './types'
import { isHistory, isSummary } from './valid'

export interface FleetView<T> {
  key: string
  load(wire: Wire, pc: string): Promise<T>
  valid(value: unknown): value is T
}

interface PcState<T> {
  at: number
  summary?: T
  failure: string
  busy: boolean
}

const queryOf = (range: UsageRange, origin: PageOrigin) => ({ ...usageQuery(range), ...(origin !== 'all' && { origin }) })

export const summaryView = (range: UsageRange, origin: PageOrigin): FleetView<UsageSummary> => ({
  key: `${range}|${origin}`,
  load: (wire, pc) => wire.call(usageSummary, queryOf(range, origin), pc),
  valid: isSummary,
})

export const historyView: FleetView<UsageHistory> = {
  key: 'history',
  load: (wire, pc) => {
    const { since, zone } = historyQuery(Date.now())
    return wire.call(usageHistory, { since, zone }, pc)
  },
  valid: isHistory,
}

const idle = <T>(cached?: Cached<T>): PcState<T> => ({ at: cached?.at ?? 0, summary: cached?.summary, failure: '', busy: false })

export const fleetLoader = <T>(wire: Wire, pcs: () => Pc[], view: () => FleetView<T>) => {
  const states = sig(new Map<string, PcState<T>>())
  const asked = new Set<string>()
  let generation = 0

  const put = (id: string, patch: Partial<PcState<T>>) => {
    const next = new Map(states.get())
    next.set(id, { ...(next.get(id) ?? idle<T>()), ...patch })
    states.set(next)
  }

  const seed = (pc: Pc) => {
    const { key, valid } = view()
    put(pc.id, idle(readCache(pc.id, key, valid)))
  }

  const ask = (pc: Pc) => {
    const { key, load } = view()
    const run = generation
    asked.add(pc.id)
    put(pc.id, { busy: true })
    load(wire, pc.id)
      .then(result => {
        if (run !== generation) return
        const cached = { at: Date.now(), summary: result }
        writeCache(pc.id, key, cached)
        put(pc.id, { ...cached, failure: '', busy: false })
      })
      .catch(error => {
        if (run === generation) put(pc.id, { failure: unanswered(error) ? '' : errorMessage(error), busy: false })
      })
  }

  const sync = () => {
    for (const pc of pcs()) {
      if (!states.get().has(pc.id)) seed(pc)
      if (!pc.online) asked.delete(pc.id)
      else if (!asked.has(pc.id)) ask(pc)
    }
  }

  const reload = (id: string) => {
    const found = pcs().find(pc => pc.id === id && pc.online)
    if (found) ask(found)
  }

  const refresh = () => {
    generation++
    asked.clear()
    sync()
  }

  return {
    states,
    busy: derive(() => [...states.get().values()].some(state => state.busy)),
    load: () => {
      states.set(new Map())
      refresh()
    },
    refresh,
    reload,
    sync,
  }
}
