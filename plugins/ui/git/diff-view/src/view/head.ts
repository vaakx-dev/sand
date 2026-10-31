import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span } from '@vaakx-dev/vrui'
import type { DiffHeadFile, DiffHeadOptions } from '../contract'

const renamedFrom = (kit: Kit, file: () => DiffHeadFile) =>
  show(
    () => Boolean(file().from),
    () => span({ class: 'flex min-w-0 shrink items-center gap-1' }, kit.pathLabel(() => file().from ?? ''), span({ class: 'shrink-0 text-neutral-500' }, '→')),
  )

export const fileHead = (kit: Kit, file: () => DiffHeadFile, { open, tags = null, actions = null }: DiffHeadOptions) =>
  div(
    { class: [kit.layer.sticky, 'sticky top-12 flex h-10 items-center gap-2 border-b border-neutral-800 bg-neutral-950 pr-3'] },
    kit.rowButton(
      {
        class: 'h-full flex-1 gap-2 pl-3 text-sm',
        title: () => (open.get() ? 'Collapse' : 'Expand'),
        'aria-expanded': () => String(open.get()),
        onClick: open.toggle(),
      },
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, kit.chevron(() => open.get())),
      kit.fileKindMark(() => file().kind),
      renamedFrom(kit, file),
      kit.pathLabel(() => file().path),
      tags,
      span({ class: 'flex-1' }),
      kit.lineStat(
        () => file().add,
        () => file().del,
      ),
    ),
    actions,
  )
