import { samePull } from '@sand/github/contract'
import { pullRef, pullStateLook } from '@sand/github/look'
import type { InboxPull } from '@sand/pull-inbox/contract'
import { ago } from '@sand/util'
import { type Derive, derive, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import { threadChip } from '../links/chip'
import type { PageParts } from '../parts'
import { inlineMerge } from './merge'

const repoName = (repo: string) => repo.split('/').at(-1) ?? repo

const stateMark = (parts: PageParts, pull: Sig<InboxPull>) =>
  dynamicChild(
    pull.map(value => value.state),
    state => {
      const look = pullStateLook(state)
      return span({ class: ['inline-flex', parts.kit.toneText[look.tone]], title: look.label }, parts.kit.icon(look.icon, 16))
    },
  )

const repeatsState = ({ state, reason }: InboxPull) => state !== 'draft' && reason.text === pullStateLook(state).label

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
  span({ class: 'tabular-nums', title: () => new Date(pull.get().updated).toLocaleString() }, () => {
    minute.get()
    return ago(pull.get().updated)
  }),
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

export const pullRow = (parts: PageParts, pull: Sig<InboxPull>, minute: Derive<number>) =>
  parts.kit.listRow({
    lead: stateMark(parts, pull),
    title: [() => pull.get().title, span({ class: 'text-neutral-500' }, () => ` #${pull.get().number}`)],
    meta: () => metaText(pull.get(), parts.list.oneRepo.get()),
    trail: trail(parts, pull, minute),
    actions: actions(parts, pull),
    current: () => {
      const chosen = parts.selected.get()
      return chosen ? samePull(chosen, pull.get()) : false
    },
    onClick: () => parts.select(pullRef(pull.get())),
  })
