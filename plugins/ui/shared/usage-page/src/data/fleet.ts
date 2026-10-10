import type { UsageSummary } from '@sand/usage/contract'
import type { Wire } from '@sand/web-client/contract'
import { derive, errorMessage, sig, type Sig } from '@sand/dom'
import { queryFor, type Range } from '../range'
import { readCache, writeCache, type Cached } from './cache'
import type { Pc } from './types'
import { isSummary } from './valid'

interface PcState {
  at: number
  summary?: UsageSummary
  failure: string
  busy: boolean
}

const idle = (cached?: Cached): PcState => ({ at: cached?.at ?? 0, summary: cached?.summary, failure: '', busy: false })

export const fleetLoader = (wire: Wire, pcs: () => Pc[], range: Sig<Range>) => {
  const states = sig(new Map<string, PcState>())
  const asked = new Set<string>()
  let generation = 0

  const put = (id: string, patch: Partial<PcState>) => {
    const next = new Map(states.get())
    next.set(id, { ...(next.get(id) ?? idle()), ...patch })
    states.set(next)
  }

  const seed = (pc: Pc) => put(pc.id, idle(readCache(pc.id, range.get())))

  const ask = (pc: Pc) => {
    const current = range.get()
    const run = generation
    asked.add(pc.id)
    put(pc.id, { busy: true })
    wire
      .call<unknown>({ type: 'usage.summary', ...queryFor(current) }, pc.local ? undefined : pc.id)
      .then(result => {
        if (!isSummary(result)) throw new Error('it needs a newer sand to report usage')
        if (run !== generation) return
        const cached = { at: Date.now(), summary: result }
        writeCache(pc.id, current, cached)
        put(pc.id, { ...cached, failure: '', busy: false })
      })
      .catch(error => {
        if (run === generation) put(pc.id, { failure: errorMessage(error), busy: false })
      })
  }

  const sync = () => {
    const known = states.get()
    for (const pc of pcs()) {
      if (!known.has(pc.id)) seed(pc)
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
