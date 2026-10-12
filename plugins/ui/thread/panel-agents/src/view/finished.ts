import { div, dynamicChild, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Repeated } from '../runs/counts'
import { memberRows } from './members'
import { agentMenu } from './menu'
import { meta, pressable, since, titleFont, type Rows } from './parts'

export const finishedRow = (item: Sig<Repeated>, now: Sig<number>, rows: Rows) => {
  const { badge, statusBadge } = rows.kit
  const run = item.map(value => value.run)
  const open = sig(false)
  const foldable = () => run.get().kind === 'workflow' && run.get().members.length > 0
  const press = () => {
    const session = run.get().session
    if (session) rows.open(session)
    else if (foldable()) open.set(!open.get())
  }
  return div(
    pressable(
      {
        class: 'flex h-8 min-w-0 items-center gap-2 px-2 text-sm text-neutral-100',
        press,
        enabled: () => Boolean(run.get().session) || foldable(),
        menu: { on: rows.menu, spec: () => agentMenu(rows, { title: run.get().title, session: run.get().session }) },
      },
      span({ class: ['min-w-0 flex-1 truncate', titleFont(run.get())], title: run.map(value => value.title) }, run.map(value => value.title)),
      show(
        item.map(value => value.count > 1),
        () => badge('neutral', () => `×${item.get().count}`),
      ),
      meta(() => {
        const value = run.get()
        return value.ended ? since(value.started, value.ended, value.ended) : ''
      }),
      dynamicChild(
        run.map(value => value.status),
        statusBadge,
      ),
    ),
    show(open, () =>
      div(
        { class: 'ml-3 border-l border-neutral-800 pl-1' },
        memberRows(
          run.map(value => value.members),
          now,
          rows,
        ),
      ),
    ),
  )
}
