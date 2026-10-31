import { pullStateLook } from '@sand/github/look'
import { plural } from '@sand/util'
import { div, dynamicChild, list, show, span } from '@vaakx-dev/vrui'
import { threadChip } from '../links/chip'
import { metaRow } from '../pull/meta'
import { mainAction } from './main/view'
import { moreMenu } from './more/menu'
import type { Shown } from './shown'
import { pullTitle } from './title'

const topLine = (shown: Shown) => {
  const { kit, narrow } = shown.parts
  const pull = shown.pull
  return metaRow(
    show(narrow, () => kit.iconButton({ size: 'sm', title: 'Back to the list', 'aria-label': 'Back to the list', onClick: () => shown.parts.select(undefined) }, kit.icon('back', 14))),
    span({ class: 'min-w-0 truncate' }, () => `${pull().repo} · #${pull().number}`),
    span({ class: 'flex-1' }),
    kit.iconButton({ size: 'sm', title: 'Open on GitHub', 'aria-label': 'Open on GitHub', onClick: () => kit.openTab(pull().url) }, kit.icon('external', 14)),
    show(
      () => !narrow.get(),
      () => kit.closeButton({ size: 'sm', title: 'Close the pull request', onClick: () => shown.parts.select(undefined) }),
    ),
  )
}

const factsLine = (shown: Shown) => {
  const { kit } = shown.parts
  const pull = shown.pull
  return div(
    { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400' },
    dynamicChild(
      () => pull().state,
      state => {
        const look = pullStateLook(state)
        return kit.badge(look.tone, kit.icon(look.icon, 12), look.label)
      },
    ),
    span({ class: 'min-w-0 truncate font-mono', title: () => `${pull().head} into ${pull().base}` }, () => `${pull().base} ← ${pull().head}`),
    span({ class: 'shrink-0' }, () => plural(pull().files, 'file')),
    kit.lineStat(
      () => pull().add,
      () => pull().del,
    ),
  )
}

const threadsLine = (shown: Shown) =>
  show(
    () => shown.linked.get().length > 0,
    () =>
      list(
        shown.linked,
        linked => linked.session,
        linked => threadChip(shown.parts, () => linked.get(), true),
        div({ class: 'flex min-w-0 flex-wrap items-center gap-1' }),
      ),
  )

export const detailHead = (shown: Shown) =>
  div(
    { class: 'flex shrink-0 flex-col gap-2 border-b border-neutral-800 px-4 pt-2 pb-3' },
    topLine(shown),
    pullTitle(shown),
    factsLine(shown),
    threadsLine(shown),
    div({ class: 'flex min-w-0 items-start justify-end gap-2' }, mainAction(shown), moreMenu(shown)),
  )
