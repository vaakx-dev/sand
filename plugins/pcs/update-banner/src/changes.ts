import type { BuildChange } from '@sand/host-dist/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { capital, plural } from '@sand/util'
import { div, p, show, sig, span } from '@vaakx-dev/vrui'

const kinds: Record<string, string> = { feat: 'New', fix: 'Fixed', perf: 'Faster' }

const scopeName = (scope: string) => capital(scope.replace(/[-_]/g, ' '))

const isNotable = (change: BuildChange) => change.type in kinds

const changeRow = ({ badge }: Kit, change: BuildChange) =>
  div(
    { class: 'flex items-start gap-3' },
    div({ class: 'flex w-12 shrink-0 pt-px' }, badge('neutral', kinds[change.type] ?? 'Other')),
    p(
      { class: 'min-w-0 flex-1 text-sm text-neutral-100 wrap-anywhere' },
      change.scope ? span({ class: 'text-neutral-400' }, `${scopeName(change.scope)} · `) : null,
      change.scope ? change.summary : capital(change.summary),
    ),
  )

const otherChanges = (kit: Kit, others: BuildChange[], folded: boolean) => {
  const { quietButton } = kit
  const open = sig(!folded)
  const label = () => (open.get() ? 'Hide other changes' : `Show ${plural(others.length, 'other change')}`)
  return div(
    { class: 'flex flex-col gap-2' },
    show(open, () => div({ class: 'flex flex-col gap-2' }, ...others.map(change => changeRow(kit, change)))),
    folded ? div({ class: 'flex' }, quietButton({ size: 'sm', surface: 'group', onClick: open.toggle() }, label)) : null,
  )
}

export const changesRow = (kit: Kit, changes: BuildChange[]) => {
  const notable = changes.filter(isNotable)
  const others = changes.filter(change => !isNotable(change))
  return kit.sectionRow(
    {},
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-2' },
      ...notable.map(change => changeRow(kit, change)),
      others.length ? otherChanges(kit, others, notable.length > 0) : null,
    ),
  )
}
