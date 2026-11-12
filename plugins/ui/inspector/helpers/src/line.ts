import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { MenuAction, Row } from '@sand/ui-shell/contract'
import { derive, div, list, type Sig } from '@vaakx-dev/vrui'

interface Line {
  row(): Row
  menu(): MenuSpec
  open?(): void
}

interface Card<T> {
  caption(): string
  items(): T[]
  key(item: T): string
  line(item: T): Line
}

const stopAction = (stop: () => void): MenuAction => ({ id: 'stop', group: 'run', label: 'Stop', icon: 'stop', danger: true, run: stop })

const helperLine = (kit: Kit, { row, menu, open }: Line) => {
  const actions = kit.contextMenu()
  const click = (event: MouseEvent) => (open ? open() : actions.openBelow(event, menu))
  return div(
    { class: 'flex min-w-0 items-center gap-1' },
    kit.workRow({ surface: 'raised', class: 'min-w-0 flex-1', ...actions.target(menu, click) }, kit.rowBody(row, { form: 'line' })),
    actions.button(menu, { size: 'sm' }),
    actions.view(),
  )
}

const helperCard = <T>(kit: Kit, { caption, items, key, line }: Card<T>) => {
  const listed = derive(items)
  return div(
    { class: 'flex min-w-0 flex-col' },
    kit.cardCaption(caption),
    list(listed, key, (item: Sig<T>) => helperLine(kit, line(item.get())), div({ class: 'flex min-w-0 flex-col' })),
  )
}

export { helperCard, stopAction }
