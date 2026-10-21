import type { BuildChange } from '@sand/host-dist/contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { capital, plural } from '@sand/util'
import { div, p, show, sig, span } from '@vaakx-dev/vrui'

interface Kind {
  label: string
  tone: Tone
}

const kinds: Record<string, Kind> = {
  feat: { label: 'New', tone: 'accent' },
  fix: { label: 'Fixed', tone: 'success' },
  perf: { label: 'Faster', tone: 'success' },
}

const other: Kind = { label: 'Other', tone: 'neutral' }

const scopeName = (scope: string) => capital(scope.replace(/[-_]/g, ' '))

export const isNotable = (change: BuildChange) => change.type in kinds

export const changeLine = (change: BuildChange) => (change.scope ? `${scopeName(change.scope)}: ${change.summary}` : capital(change.summary))

const changeRow = (kit: Kit, change: BuildChange) => {
  const { badge } = kit
  const kind = kinds[change.type] ?? other
  return div(
    { class: 'flex items-start gap-3' },
    div({ class: 'flex w-12 shrink-0 pt-px' }, badge(kind.tone, kind.label)),
    p(
      { class: 'min-w-0 flex-1 text-sm text-neutral-200 wrap-anywhere' },
      change.scope ? span({ class: 'text-neutral-500' }, `${scopeName(change.scope)} · `) : null,
      change.scope ? change.summary : capital(change.summary),
    ),
  )
}

const otherChanges = (kit: Kit, others: BuildChange[], folded: boolean) => {
  const { quietButton } = kit
  const open = sig(!folded)
  const label = () => (open.get() ? 'Hide other changes' : `Show ${plural(others.length, 'other change')}`)
  return div(
    { class: 'flex flex-col gap-2' },
    show(open, () => div({ class: 'flex flex-col gap-2' }, ...others.map(change => changeRow(kit, change)))),
    folded ? div({ class: 'flex' }, quietButton({ size: 'sm', onClick: open.toggle() }, label)) : null,
  )
}

export const changeList = (kit: Kit, changes: BuildChange[]) => {
  const notable = changes.filter(isNotable)
  const others = changes.filter(change => !isNotable(change))
  return div(
    { class: 'flex flex-col gap-2' },
    ...notable.map(change => changeRow(kit, change)),
    others.length ? otherChanges(kit, others, notable.length > 0) : null,
  )
}
