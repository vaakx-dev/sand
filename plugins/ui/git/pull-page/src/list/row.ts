import type { InboxPull } from '@sand/pull-inbox/contract'
import { ago } from '@sand/util'
import { type Derive, derive, div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import { threadChip } from '../links/chip'
import type { PageParts } from '../parts'
import { metaRow } from '../pull/meta'
import { lineStat } from '../pull/stat'
import { stateLook } from '../pull/look'
import { lowerKey, refOf } from '../pull/ref'
import { inlineMerge } from './merge'

const repoName = (repo: string) => repo.split('/').at(-1) ?? repo

const stateMark = (parts: PageParts, pull: Sig<InboxPull>) =>
  dynamicChild(
    pull.map(value => value.state),
    state => {
      const look = stateLook(state)
      return span({ class: ['inline-flex shrink-0', parts.kit.toneText[look.tone]], title: look.label }, parts.kit.icon(look.icon, 16))
    },
  )

const rightSide = (parts: PageParts, pull: Sig<InboxPull>) =>
  dynamicChild(
    pull.map(value => (value.reason.group === 'ready' && value.state === 'open' ? 'merge' : 'reason')),
    kind =>
      kind === 'merge'
        ? inlineMerge(parts, () => pull.get())
        : dynamicChild(
            pull.map(value => value.reason),
            reason => parts.kit.badge(reason.tone, reason.text),
          ),
  )

const linkedChips = (parts: PageParts, pull: Sig<InboxPull>) =>
  list(
    derive(() => parts.links.of(pull.get())),
    linked => linked.session,
    linked => threadChip(parts, () => linked.get()),
    span({ class: 'flex min-w-0 items-center gap-1' }),
  )

const pullMeta = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>) => {
  const value = () => pull.get()
  return metaRow(
    span({ class: 'shrink-0' }, () => value().author),
    span({ class: 'shrink-0 text-neutral-500' }, '·'),
    span({ class: 'min-w-0 truncate', title: () => value().repo }, () => repoName(value().repo)),
    show(
      () => value().unresolved > 0,
      () => span({ class: 'shrink-0' }, () => `· ${value().unresolved} unresolved`),
    ),
    linkedChips(parts, pull),
    span({ class: 'flex-1' }),
    lineStat(parts.kit, () => value().add, () => value().del),
    span({ class: 'shrink-0 tabular-nums', title: () => new Date(value().updated).toLocaleString() }, () => {
      minute.get()
      return ago(value().updated)
    }),
  )
}

export const pullRow = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>) => {
  const { kit } = parts
  const selected = () => {
    const chosen = parts.selected.get()
    return chosen ? lowerKey(chosen) === lowerKey(pull.get()) : false
  }
  return div(
    {
      class: ['flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2 transition-colors hover:bg-neutral-800', () => (selected() ? 'bg-neutral-800' : '')],
      onClick: () => parts.select(refOf(pull.get())),
    },
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      stateMark(parts, pull),
      kit.plainButton(
        { class: 'min-w-0 flex-1 truncate text-left text-sm text-neutral-100', 'aria-current': () => String(selected()), title: () => pull.get().title },
        () => pull.get().title,
        span({ class: 'text-neutral-500' }, () => ` #${pull.get().number}`),
      ),
      rightSide(parts, pull),
    ),
    pullMeta(parts, pull, minute),
  )
}
