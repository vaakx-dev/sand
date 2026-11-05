import { contextLink, type ContextRecord } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { prevent, span } from '@vaakx-dev/vrui'
import type { ChipKind, ChipLink } from '../contract'

export const chipView = ({ icon, plainButton }: Kit, kind: ChipKind, link: ChipLink, record: ContextRecord | undefined, open: () => void) =>
  plainButton(
    {
      class: ['inline-flex max-w-full items-center gap-1 rounded-md bg-neutral-700 px-1.5 align-top', record ? 'text-neutral-100' : 'text-neutral-400'],
      title: `${kind.title}: ${link.label}`,
      'data-markdown': contextLink(link),
      onMouseDown: prevent,
      onClick: open,
    },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(kind.icon, 'xs')),
    span({ class: 'min-w-0 truncate' }, link.label),
  )
