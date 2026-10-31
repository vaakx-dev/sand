import { div } from '@vaakx-dev/vrui'
import { checksList } from './checks'
import { factRows } from './facts'
import { nextCallout } from './next'
import { overview } from './overview'
import type { Shown } from './shown'
import { watchRow } from './watch'

const unlinkButton = ({ parts, link, at, state }: Shown) =>
  parts.kit.quietButton(
    { size: 'sm', title: 'Remove this pull request from the thread', disabled: state.busy, onClick: () => void state.run(() => parts.actions.unlink(link, at)) },
    parts.kit.icon('x', 14),
    'Unlink',
  )

export const pullDetail = (shown: Shown) => {
  const { kit } = shown.parts
  const { summary } = shown.link
  return div(
    { class: 'flex flex-col gap-4' },
    overview(shown),
    summary ? nextCallout(shown, summary) : null,
    summary ? checksList(kit, summary) : null,
    summary ? factRows(summary) : null,
    watchRow(shown),
    div({ class: 'flex justify-end' }, unlinkButton(shown)),
  )
}
