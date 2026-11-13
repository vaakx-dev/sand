import { type PcView, pcHello, pcs, pcsChange, wire } from '@sand/devices-contract'
import { featuresList, featuresSet } from '@sand/features/contract'
import { projects } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
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
  const changes = pulse(ctx, [pcsChange, pcHello], [pcs])
  const range = sig<Range>('15m')
  const heard = sig(new Map<string, Heard>())
  const guard = sig<boolean | undefined>(undefined)

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

  const read = (pc: PcView) =>
    ctx.wire.call(performanceRead, { range: range.get() }, pc.id).then(
      report => remember(pc.id, () => ({ report, at: Date.now() })),
      () => remember(pc.id, old => old && { ...old, failed: old.failed ?? Date.now() }),
    )

  const readGuard = (pc: PcView) => ctx.wire.call(featuresList, {}, pc.id).then(({ features }) => guard.set(features.find(feature => feature.id === GUARD)?.on))

  const answering = () => list().filter(pc => pc.online)

  return {
    range,
    guard,
    list,
    heard: (pc: string) => heard.get().get(pc),
    seen: () => ({ pcs: list(), heard: heard.get() }),
    where(place: ChatPlace, device: string) {
      if (place.kind === 'bot') return 'bot'
      return ctx.get(projects)?.shown({ path: place.cwd, device, project: place.project, quick: place.quick }).name ?? place.cwd
    },
    silent: (found: Heard | undefined) => found !== undefined && (found.failed !== undefined || Date.now() - found.at > SILENT_AFTER_MS),
    refresh() {
      const online = answering()
      void Promise.all(online.map(read))
      const home = online.find(pc => pc.home)
      if (home) readGuard(home).catch(() => {})
    },
    choose(next: Range) {
      range.set(next)
      void Promise.all(answering().map(read))
    },
    async setGuard(on: boolean) {
      guard.set(on)
      await Promise.all(answering().map(pc => ctx.wire.call(featuresSet, { changes: { [GUARD]: on } }, pc.id)))
    },
  }
}

export type Model = ReturnType<typeof createModel>
