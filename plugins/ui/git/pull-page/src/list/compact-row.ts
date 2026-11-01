import type { InboxPull } from '@sand/pull-inbox/contract'
import { type Derive, span, type Sig } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'
import { repeatsState, repoName, stateMark, updatedAgo } from './marks'

const noteText = (pull: InboxPull) =>
  [repeatsState(pull) ? '' : pull.reason.text, pull.unresolved > 0 ? `${pull.unresolved} unresolved` : ''].filter(Boolean).join(' · ')

const placeLine = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>) =>
  span(
    { class: 'flex min-w-0 items-center gap-1.5' },
    stateMark(parts, pull),
    span({ class: 'min-w-0 flex-1 truncate' }, () => `${repoName(pull.get().repo)} #${pull.get().number}`),
    updatedAgo(pull, minute),
  )

const noteLine = (parts: PageParts, pull: Sig<InboxPull>) =>
  span(
    { class: 'flex min-w-0 items-center gap-2' },
    parts.kit.lineStat(
      () => pull.get().add,
      () => pull.get().del,
    ),
    span({ class: 'min-w-0 truncate' }, () => noteText(pull.get())),
  )

export const compactRow = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>, current: () => boolean, open: () => void) =>
  parts.kit.listRow({
    overline: placeLine(parts, pull, minute),
    title: () => pull.get().title,
    meta: noteLine(parts, pull),
    current,
    onClick: open,
  })
