import { div, span, type Child } from '@vaakx-dev/vrui'
import { rowButton } from '../buttons/button'
import { surfaceFill } from '../surface'

export interface ChipRowProps {
  title: Child
  lead?: Child
  meta?: Child
  action?: Child
  onClick?: () => void
}

const fill = surfaceFill('raised')

const rowShape = 'flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2'

export const chipRow = ({ title, lead, meta, action, onClick }: ChipRowProps) => {
  const body = [
    lead ? span({ class: 'inline-flex shrink-0 text-neutral-400' }, lead) : null,
    span({ class: 'min-w-0 flex-1 truncate' }, title),
    meta ? span({ class: 'flex shrink-0 items-center text-xs text-neutral-500 tabular-nums' }, meta) : null,
  ]
  const main = onClick ? rowButton({ role: 'menuitem', class: [rowShape, fill.hover], onClick: () => onClick() }, ...body) : div({ class: rowShape }, ...body)
  return div(
    { class: ['flex min-w-0 items-center gap-1 text-sm text-neutral-100', action && 'pr-1'] },
    main,
    action ? span({ class: 'flex shrink-0 items-center gap-1' }, action) : null,
  )
}
