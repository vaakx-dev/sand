import { type PcView, pcHello, pcs, pcsChange, wire } from '@sand/devices-contract'
import { featureState, featuresSet } from '@sand/features/contract'
import { projects } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { tildeHome } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type ChatPlace, type PcReport, performanceRead, type Range } from '../contract'

const GUARD = 'memory-guard'
const SILENT_AFTER_MS = 10_000

export interface Heard {
  report: PcReport
  at: number
  failed?: number
}

type ModelContext = Context<{ wire: typeof wire; pcs: typeof pcs }>

const homeFirst = (first: PcView, second: PcView) => Number(second.home) - Number(first.home) || first.name.localeCompare(second.name)

export const createModel = (ctx: ModelContext) => {
  const changes = pulse(ctx, [pcsChange, pcHello], [pcs, featureState])
  const range = sig<Range>('15m')
  const heard = sig(new Map<string, Heard>())
  const choosing = sig<boolean | undefined>(undefined)
  const reading = new Set<string>()
  let shownSince = Date.now()

  const list = () => {
    changes.version.get()
    return ctx.pcs.list().toSorted(homeFirst)
  }

  const remember = (pc: string, update: (old: Heard | undefined) => Heard | undefined) => {
    const next = new Map(heard.get())
    const value = update(next.get(pc))
    if (value) next.set(pc, value)
    heard.set(next)
  }

  const read = (pc: PcView) => {
    const asked = range.get()
    const current = () => range.get() === asked
    reading.add(pc.id)
    return ctx.wire
      .call(performanceRead, { range: asked }, pc.id)
      .then(
        report => current() && remember(pc.id, () => ({ report, at: Date.now() })),
        () => current() && remember(pc.id, old => old && { ...old, failed: old.failed ?? Date.now() }),
      )
      .finally(() => reading.delete(pc.id))
  }

  const answering = () => list().filter(pc => pc.online)

  const refresh = () => void Promise.all(answering().filter(pc => !reading.has(pc.id)).map(read))

  const guard = () => {
    changes.version.get()
    return choosing.get() ?? ctx.get(featureState)?.on(GUARD)
  }

  return {
    range,
    guard,
    list,
    heard: (pc: string) => heard.get().get(pc),
    seen: () => ({ pcs: list(), heard: heard.get() }),
    where(place: ChatPlace, device: string) {
      if (place.kind === 'bot') return 'bot'
      return ctx.get(projects)?.shown({ path: place.cwd, device, project: place.project, quick: place.quick }).name ?? tildeHome(place.cwd)
    },
    silent: (found: Heard | undefined) => found !== undefined && (found.failed !== undefined || Date.now() - Math.max(found.at, shownSince) > SILENT_AFTER_MS),
    open() {
      shownSince = Date.now()
      refresh()
    },
    refresh,
    choose(next: Range) {
      range.set(next)
      void Promise.all(answering().map(read))
    },
    async setGuard(on: boolean) {
      choosing.set(on)
      await Promise.all(answering().map(pc => ctx.wire.call(featuresSet, { changes: { [GUARD]: on } }, pc.id))).finally(() => choosing.set(undefined))
    },
  }
}

export type Model = ReturnType<typeof createModel>
