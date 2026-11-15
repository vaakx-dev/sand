import { isPcUnavailable, type PcView, pcHello, pcs, pcsChange, wire } from '@sand/devices-contract'
import { featureState, featuresSet } from '@sand/features/contract'
import { projects } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { tildeHome } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { applied } from '../change'
import { type ChatPlace, type PcChange, type PcReport, performanceChange, performanceUnwatch, performanceWatch, type Range } from '../contract'

const GUARD = 'memory-guard'

export interface Heard {
  report: PcReport
  failed?: number
}

type ModelContext = Context<{ wire: typeof wire; pcs: typeof pcs }>

const homeFirst = (first: PcView, second: PcView) => Number(second.home) - Number(first.home) || first.name.localeCompare(second.name)

export const createModel = (ctx: ModelContext) => {
  const changes = pulse(ctx, [pcsChange, pcHello], [pcs, featureState])
  const range = sig<Range>('15m')
  const heard = sig(new Map<string, Heard>())
  const choosing = sig<boolean | undefined>(undefined)
  let watching = false

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

  const watch = (pc: string) => {
    const asked = range.get()
    const current = () => watching && range.get() === asked
    void ctx.wire.call(performanceWatch, { range: asked }, pc).then(
      report => current() && remember(pc, () => ({ report })),
      () => current() && remember(pc, old => old && { ...old, failed: old.failed ?? Date.now() }),
    )
  }

  const unwatch = (pc: string) =>
    void ctx.wire.call(performanceUnwatch, {}, pc).catch(error => {
      if (!isPcUnavailable(error)) ctx.report(error)
    })

  const changed = (change: PcChange, pc: string) => watching && remember(pc, old => old && { ...old, report: applied(old.report, change) })

  const answering = () => list().filter(pc => pc.online)

  const watchAll = () => answering().forEach(pc => watch(pc.id))

  const guard = () => {
    changes.version.get()
    return choosing.get() ?? ctx.get(featureState)?.on(GUARD)
  }

  ctx.effect(() => ctx.wire.on(performanceChange, changed, { from: 'all' }))
  ctx.on(pcHello, pc => {
    if (watching) watch(pc)
  })

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
    open() {
      watching = true
      watchAll()
      return () => {
        watching = false
        answering().forEach(pc => unwatch(pc.id))
      }
    },
    choose(next: Range) {
      range.set(next)
      watchAll()
    },
    async setGuard(on: boolean) {
      choosing.set(on)
      await Promise.all(answering().map(pc => ctx.wire.call(featuresSet, { changes: { [GUARD]: on } }, pc.id))).finally(() => choosing.set(undefined))
    },
  }
}

export type Model = ReturnType<typeof createModel>
