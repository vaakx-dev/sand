import { div, read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { metaLine, rowTitle } from '../heads/text'
import { choiceCheck } from '../menus/menu-item'
import { placeLook, type Surface } from '../surface'

export type ListRowProps = Omit<Props<HTMLButtonElement>, 'title'> & {
  title: Child
  meta?: Child
  lead?: Child
  trail?: Child
  actions?: Child
  current?: MaybeReactive<boolean>
  selected?: MaybeReactive<boolean>
  expanded?: MaybeReactive<boolean>
  tone?: 'danger'
  touch?: boolean
  surface?: Surface
}

const compact = 'min-h-8 rounded-md px-2'

const shapes: Record<Surface, string> = { page: compact, raised: compact, group: 'min-h-12 bg-neutral-800 px-4' }

const dangerText = 'text-danger-400 hover:text-danger-400 aria-current:text-danger-400 aria-selected:text-danger-400 aria-pressed:text-danger-400'

const flag = (name: string, value: MaybeReactive<boolean> | undefined) => (value === undefined ? {} : { [name]: () => String(read(value)) })

const withActions = (row: HTMLElement, surface: Surface, actions: Child) =>
  div(
    { class: ['flex min-w-0 items-center gap-1', surface === 'group' && 'bg-neutral-800 pr-4'] },
    row,
    span({ class: 'flex shrink-0 items-center gap-1' }, actions),
  )

export const listRow = ({ title, meta, lead, trail, actions, current, selected, expanded, tone, touch, surface = 'page', class: extra, ...props }: ListRowProps) => {
  const look = placeLook(false, surface, 'text-neutral-100', false)
  const row = rowButton(
    {
      ...(current !== undefined && { 'aria-current': () => (read(current) ? 'true' : 'false') }),
      ...flag('aria-expanded', expanded),
      ...props,
      class: [
        'group gap-3 py-1.5 text-sm ring-inset transition-colors',
        shapes[surface],
        touch && 'touch:min-h-12',
        actions !== undefined && 'flex-1',
        look,
        tone === 'danger' && dangerText,
        extra,
      ],
    },
    lead ? span({ class: 'inline-flex shrink-0 text-neutral-400' }, lead) : null,
    div({ class: 'flex min-w-0 flex-1 flex-col' }, rowTitle(title), meta ? metaLine(meta) : null),
    trail ? span({ class: 'flex shrink-0 items-center gap-2 text-xs text-neutral-500' }, trail) : null,
    selected === undefined ? null : choiceCheck(selected),
  )
  return actions === undefined ? row : withActions(row, surface, actions)
}
