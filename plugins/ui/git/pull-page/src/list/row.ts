import { samePull } from '@sand/github/contract'
import { pullRef } from '@sand/github/look'
import type { InboxPull } from '@sand/pull-inbox/contract'
import { type Derive, derive, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import { threadChip } from '../links/chip'
import type { PageParts } from '../parts'
import { compactRow } from './compact-row'
import { repeatsState, repoName, stateMark, updatedAgo } from './marks'
import { inlineMerge } from './merge'

const canMergeHere = ({ reason, state }: InboxPull) => reason.group === 'ready' && state === 'open'

const reasonBadge = (parts: PageParts, pull: Sig<InboxPull>) =>
  dynamicChild(
    pull.map(value => (repeatsState(value) || canMergeHere(value) ? undefined : value.reason)),
    reason => (reason ? parts.kit.badge(reason.tone, reason.text) : null),
  )

const metaText = ({ author, repo, unresolved }: InboxPull, oneRepo: boolean) =>
  [author, oneRepo ? '' : repoName(repo), unresolved > 0 ? `${unresolved} unresolved` : ''].filter(Boolean).join(' · ')

const trail = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>) => [
  reasonBadge(parts, pull),
  parts.kit.lineStat(
    () => pull.get().add,
    () => pull.get().del,
  ),
  updatedAgo(pull, minute),
]

const actions = (parts: PageParts, pull: Sig<InboxPull>) => [
  show(
    () => !parts.selected.get(),
    () =>
      list(
        derive(() => parts.agent.linked(pull.get())),
        linked => linked.session,
        linked => threadChip(parts, () => linked.get()),
        span({ class: 'flex min-w-0 items-center gap-1' }),
      ),
  ),
  show(
    () => canMergeHere(pull.get()),
    () => inlineMerge(parts, () => pull.get()),
  ),
]

const wideRow = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>, current: () => boolean, open: () => void) =>
  parts.kit.listRow({
    lead: stateMark(parts, pull),
    title: [() => pull.get().title, span({ class: 'text-neutral-500' }, () => ` #${pull.get().number}`)],
    meta: () => metaText(pull.get(), parts.list.oneRepo.get()),
    trail: trail(parts, pull, minute),
    actions: actions(parts, pull),
    current,
    onClick: open,
  })

export const pullRow = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>) => {
  const current = () => {
    const chosen = parts.selected.get()
    return chosen ? samePull(chosen, pull.get()) : false
  }
  const open = () => parts.select(pullRef(pull.get()))
  return dynamicChild(parts.narrow, narrow => (narrow ? compactRow : wideRow)(parts, pull, minute, current, open))
}
