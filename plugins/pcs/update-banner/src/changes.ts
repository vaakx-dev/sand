import { badge, div, p, quietButton, show, sig, span, type Tone } from '@sand/dom'
import type { BuildChange } from '@sand/protocol'
import { plural } from './fleet/text'

const kinds: Record<string, { label: string; tone: Tone }> = {
  feat: { label: 'New', tone: 'accent' },
  fix: { label: 'Fixed', tone: 'success' },
  perf: { label: 'Faster', tone: 'success' },
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const scopeName = (scope: string) => capital(scope.replace(/[-_]/g, ' '))

export const isNotable = (change: BuildChange) => change.type in kinds

export const changeLine = (change: BuildChange) => (change.scope ? `${scopeName(change.scope)}: ${change.summary}` : capital(change.summary))

const changeRow = (change: BuildChange) => {
  const kind = kinds[change.type] ?? { label: 'Other', tone: 'neutral' as Tone }
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

export const changeList = (changes: BuildChange[]) => {
  const notable = changes.filter(isNotable)
  const others = changes.filter(change => !isNotable(change))
  const open = sig(notable.length === 0)
  return div(
    { class: 'flex flex-col gap-2' },
    ...notable.map(changeRow),
    others.length
      ? div(
          { class: 'flex flex-col gap-2' },
          show(open, () => div({ class: 'flex flex-col gap-2' }, ...others.map(changeRow))),
          notable.length
            ? div(
                { class: 'flex' },
                quietButton({ size: 'sm', onClick: () => open.set(!open.get()) }, () =>
                  open.get() ? 'Hide other changes' : `Show ${plural(others.length, 'other change')}`,
                ),
              )
            : null,
        )
      : null,
  )
}
