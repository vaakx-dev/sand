import { layout } from '@sand/layout/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { derive, div, dynamicChild, show, span, type Child, type Derive } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import { stageMark } from './marks'
import { hasWork, showsWork, type WorkParts } from './tabs'
import { tally, type Tally } from './tasks'

export interface SummaryParts extends WorkParts {
  narrow: Derive<boolean>
}

const look = 'mx-auto flex w-full max-w-3xl items-center gap-4 px-2 pb-2 text-xs text-neutral-400'

const count = (shown: () => boolean, mark: () => Child, text: Child) => show(shown, () => span({ class: 'flex items-center gap-1.5' }, mark(), text))

const needText = (need: number) => `${need} ${need === 1 ? 'needs' : 'need'} you`

const counts = (kit: Kit, totals: Derive<Tally>) => [
  count(
    () => totals.get().run > 0,
    () => stageMark(kit, 'run', 12),
    () => `${totals.get().run} working`,
  ),
  count(
    () => totals.get().need > 0,
    () => stageMark(kit, 'need', 12),
    span({ class: 'text-warning-400' }, () => needText(totals.get().need)),
  ),
  count(
    () => totals.get().pulls > 0,
    () => kit.icon('pull-request', 12),
    () => plural(totals.get().pulls, 'PR'),
  ),
]

export const summaryLine = (ctx: WorkContext, parts: SummaryParts) => {
  const { kit } = ctx
  const totals = derive(() => tally(parts.tasks.get()))
  const counted = derive(() => totals.get().run + totals.get().need + totals.get().pulls > 0)
  const button = () =>
    kit.plainButton(
      { class: [look, 'rounded-md'], title: 'Show work and plan', onClick: () => ctx.get(layout)?.toggle('aside', true) },
      ...counts(kit, totals),
      show(
        () => !counted.get(),
        () => span(() => (showsWork(parts) ? 'Work and plan' : 'Plan')),
      ),
    )
  const line = (narrow: boolean) =>
    narrow
      ? show(() => hasWork(parts), button)
      : show(counted, () => div({ class: look }, ...counts(kit, totals)))
  return div({ class: 'contents', onMount: parts.plan.listen }, dynamicChild(parts.narrow, line))
}
