import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span } from '@vaakx-dev/vrui'
import type { DiffHeadFile, DiffHeadOptions } from '../contract'
import { kindMark, lineStat, pathLabel } from './marks'

export const fileHead = (kit: Kit, file: () => DiffHeadFile, { open, tags = null, actions = null }: DiffHeadOptions) =>
  div(
    { class: [kit.layer.sticky, 'sticky top-12 flex h-10 items-center gap-2 border-b border-neutral-800 bg-neutral-950 pr-3 pl-1 text-sm'] },
    kit.iconButton(
      { size: 'sm', title: () => (open.get() ? 'Collapse' : 'Expand'), 'aria-expanded': () => String(open.get()), onClick: open.toggle() },
      kit.chevron(() => open.get()),
    ),
    kindMark(() => file().kind),
    show(
      () => Boolean(file().from),
      () => span({ class: 'flex min-w-0 shrink items-center gap-1' }, pathLabel(() => file().from ?? ''), span({ class: 'shrink-0 text-neutral-500' }, '→')),
    ),
    pathLabel(() => file().path),
    tags,
    span({ class: 'flex-1' }),
    lineStat(
      () => file().add,
      () => file().del,
    ),
    actions,
  )
