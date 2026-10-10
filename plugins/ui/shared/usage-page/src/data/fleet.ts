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

const placeholderId = 'local'

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

  const idOf = (pc: Pc) => (pc.local ? (pcs().find(other => other.local)?.id ?? pc.id) : pc.id)

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
        writeCache(idOf(pc), current, cached)
        put(idOf(pc), { ...cached, failure: '', busy: false })
      })
      .catch(error => {
        if (run === generation) put(idOf(pc), { failure: errorMessage(error), busy: false })
      })
  }

  const adoptPlaceholder = (pc: Pc) => {
    const placeholder = states.get().get(placeholderId)
    if (!pc.local || pc.id === placeholderId || !placeholder || !asked.delete(placeholderId)) return
    asked.add(pc.id)
    put(pc.id, placeholder)
  }

  const sync = () => {
    for (const pc of pcs()) {
      adoptPlaceholder(pc)
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
