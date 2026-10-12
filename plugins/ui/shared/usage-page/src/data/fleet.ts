import type { UsageQuery, UsageSummary } from '@sand/usage/contract'
import type { Wire } from '@sand/web-client/contract'
import { errorMessage } from '@sand/kit'
import { derive, sig } from '@vaakx-dev/vrui'
import { readCache, writeCache, type Cached } from '../integrations/cache'
import type { Pc } from './types'

export interface FleetView {
  key: string
  query: UsageQuery
}

interface PcState {
  at: number
  summary?: UsageSummary
  failure: string
  busy: boolean
}

const idle = (cached?: Cached): PcState => ({ at: cached?.at ?? 0, summary: cached?.summary, failure: '', busy: false })

export const fleetLoader = (wire: Wire, pcs: () => Pc[], view: () => FleetView) => {
  const states = sig(new Map<string, PcState>())
  const asked = new Set<string>()
  let generation = 0

  const put = (id: string, patch: Partial<PcState>) => {
    const next = new Map(states.get())
    next.set(id, { ...(next.get(id) ?? idle()), ...patch })
    states.set(next)
  }

  const seed = (pc: Pc) => put(pc.id, idle(readCache(pc.id, view().key)))

  const ask = (pc: Pc) => {
    const { key, query } = view()
    const run = generation
    asked.add(pc.id)
    put(pc.id, { busy: true })
    wire
      .call<UsageSummary>({ type: 'usage.summary', ...query }, pc.id)
      .then(result => {
        if (run !== generation) return
        const cached = { at: Date.now(), summary: result }
        writeCache(pc.id, key, cached)
        put(pc.id, { ...cached, failure: '', busy: false })
      })
      .catch(error => {
        if (run === generation) put(pc.id, { failure: errorMessage(error), busy: false })
      })
  }

  const sync = () => {
    for (const pc of pcs()) {
      if (!states.get().has(pc.id)) seed(pc)
      if (!pc.online) asked.delete(pc.id)
      else if (!asked.has(pc.id)) ask(pc)
    }
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
    sync,
  }
}
