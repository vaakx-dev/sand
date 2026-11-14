import { contextChange, contextGet, type ContextPart, type ContextTone, type ContextUsage } from '@sand/compaction/contract'
import { wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { pulse, wireValues } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { tokens } from '@sand/util'
import { threadChange, threads, threadsChange } from '@sand/web-client/contract'
import { derive, div, list, sig, span, type Child, type Sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

interface Look {
  swatch: string
  segment: string
}

const looks: Record<ContextTone, Look> = {
  violet: { swatch: 'bg-violet-400', segment: 'group-hover:bg-violet-400 group-aria-expanded:bg-violet-400' },
  orange: { swatch: 'bg-orange-400', segment: 'group-hover:bg-orange-400 group-aria-expanded:bg-orange-400' },
  danger: { swatch: 'bg-danger-400', segment: 'group-hover:bg-danger-400 group-aria-expanded:bg-danger-400' },
  info: { swatch: 'bg-info-400', segment: 'group-hover:bg-info-400 group-aria-expanded:bg-info-400' },
  accent: { swatch: 'bg-accent-400', segment: 'group-hover:bg-accent-400 group-aria-expanded:bg-accent-400' },
  success: { swatch: 'bg-success-400', segment: 'group-hover:bg-success-400 group-aria-expanded:bg-success-400' },
}

const empty: ContextUsage = { used: 0, limit: 0, window: 0, parts: [] }

const percent = (size: number, window: number) => `${window ? (size / window) * 100 : 0}%`

export default definePlugin({
  name: 'inspector-context',
  description: "The inspector's context row: how full a thread's or bot's context window is and what fills it",
  inject: { inspector, kit, threads, wire },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange])
    ctx.on(threadChange, changes.schedule)
    const served = wireValues(ctx, ctx.wire, {
      key: ({ session }: Subject) => session,
      read: ({ session, owner }: Subject) => ctx.wire.call(contextGet, { session, owner }),
      change: contextChange,
      changed: payload => payload,
    })
    const usageOf = (subject: Subject) => {
      if (subject.owner !== 'thread') return served(subject)
      changes.version.get()
      return ctx.threads.get(subject.session)?.context
    }

    const breakdownLine = (swatch: string, name: string, size: Child) =>
      div({ class: 'flex items-center gap-2 py-px' }, span({ class: ['h-1 w-2 shrink-0 rounded-full', swatch] }), span(name), span({ class: 'ml-auto text-neutral-500 tabular-nums' }, size))

    const render = (subject: () => Subject) => {
      const open = sig(false)
      const usage = () => usageOf(subject()) ?? empty
      const parts = derive(() => usage().parts)
      const segment = (part: Sig<ContextPart>) =>
        span({ class: () => ['h-full shrink-0 bg-neutral-600 transition-colors', looks[part.get().tone].segment], style: () => `width:${percent(part.get().size, usage().window)}` })
      const breakdown = () =>
        div(
          { class: 'flex flex-col px-2 pb-2 text-xs text-neutral-400' },
          list(
            parts,
            part => part.name,
            part => breakdownLine(looks[part.get().tone].swatch, part.get().name, () => tokens(part.get().size)),
            div({ class: 'flex flex-col' }),
          ),
          breakdownLine('bg-neutral-800', 'Free', () => tokens(Math.max(0, usage().window - usage().used))),
          div({ class: 'py-px text-neutral-500' }, () => `Compacts at ${tokens(usage().limit)}`),
        )
      return ctx.kit.cardFold(
        { open, label: 'Context', value: [span({ class: 'font-medium text-neutral-100' }, () => tokens(usage().used)), () => ` of ${tokens(usage().window)}`] },
        div(
          { class: 'relative h-1 w-full' },
          list(parts, part => part.name, segment, div({ class: 'flex h-full w-full gap-px overflow-hidden rounded-full bg-neutral-800' })),
          span({ class: 'absolute -top-1 h-3 w-px bg-neutral-600', style: () => `left:${percent(usage().limit, usage().window)}`, title: () => `Compacts at ${tokens(usage().limit)}` }),
        ),
        breakdown,
      )
    }

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'context',
        group: 'context',
        order: 70,
        shows: subject => (usageOf(subject)?.used ?? 0) > 0,
        render,
      }),
    )
  },
})
