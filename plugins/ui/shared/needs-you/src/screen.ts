import { plural } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { clock, div, dynamicChild, list, span, type Derive } from '@vaakx-dev/vrui'
import type { Need, NeedKind } from './contract'

const groups: { kind: NeedKind; label: string }[] = [
  { kind: 'question', label: 'Questions' },
  { kind: 'secret', label: 'Sign-ins and keys' },
  { kind: 'review', label: 'Ready to review' },
]

const card = (kit: Kit, need: Need) => {
  const now = clock(30_000)
  return div(
    { class: 'flex min-w-0 flex-col gap-2 rounded-lg bg-neutral-800 px-4 py-3' },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      need.mark?.() ?? null,
      span({ class: 'min-w-0 truncate text-sm font-semibold text-neutral-100' }, need.who),
      span({ class: 'ml-auto shrink-0 text-xs text-neutral-500 tabular-nums' }, () => kit.shortAge(Math.max(0, now.get() - need.at))),
    ),
    need.render(),
  )
}

export const needsScreen = (kit: Kit, items: Derive<Need[]>) => {
  const grouped = (kind: NeedKind) => items.map(all => all.filter(need => need.kind === kind))
  const body = () =>
    div(
      { class: 'flex min-w-0 flex-col gap-6' },
      dynamicChild(items, all =>
        all.length
          ? div(
              { class: 'flex min-w-0 flex-col gap-6' },
              ...groups.map(({ kind, label }) =>
                dynamicChild(grouped(kind), shown =>
                  shown.length
                    ? div(
                        { class: 'flex min-w-0 flex-col gap-2' },
                        kit.sectionHeading(span({ class: 'min-w-0 flex-1 truncate' }, label), span({ class: 'tabular-nums text-neutral-600' }, String(shown.length))),
                        list(grouped(kind), need => need.id, need => card(kit, need.get()), div({ class: 'flex min-w-0 flex-col gap-2' })),
                      )
                    : null,
                ),
              ),
            )
          : kit.emptyState({ text: 'Nothing needs you.' }),
      ),
    )
  return kit.pageBody(
    {
      title: 'What needs you',
      intro: () => {
        const count = items.get().length
        return count === 0 ? 'Nothing is waiting.' : plural(count, 'thing') + ' ' + (count === 1 ? 'is' : 'are') + ' waiting.'
      },
    },
    body(),
  )
}
