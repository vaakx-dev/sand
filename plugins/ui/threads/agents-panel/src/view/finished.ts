import { dynamicChild, show, span, type Sig } from '@vaakx-dev/vrui'
import type { Repeated } from '../runs/repeats'
import { agentMenu } from './menu'
import { meta, pressable, since, type Rows } from './parts'

export const finishedRow = (item: Sig<Repeated>, rows: Rows) => {
  const { badge, statusBadge } = rows.kit
  const run = item.map(value => value.run)
  const press = () => {
    const session = run.get().session
    if (session) rows.open(session)
  }
  return pressable(
    {
      class: 'flex h-8 min-w-0 items-center gap-2 px-2 text-sm text-neutral-100',
      press,
      enabled: () => Boolean(run.get().session),
      menu: { on: rows.menu, spec: () => agentMenu(rows, { title: run.get().title, session: run.get().session }) },
    },
    span({ class: 'min-w-0 flex-1 truncate', title: run.map(value => value.title) }, run.map(value => value.title)),
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
  )
}
