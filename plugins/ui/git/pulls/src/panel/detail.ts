import { div } from '@vaakx-dev/vrui'
import { checksList } from './checks'
import { factRows } from './facts'
import { nextCallout } from './next'
import { overview } from './overview'
import type { Shown } from './shown'
import { watchRow } from './watch'

export const pullDetail = (shown: Shown) => {
  const { kit } = shown.parts
  const { summary } = shown.link
  return div(
    { class: 'flex flex-col gap-4' },
    overview(shown),
    summary ? nextCallout(shown, summary) : null,
    summary ? div({ class: 'flex flex-col gap-1' }, checksList(kit, summary), factRows(kit, summary)) : null,
    watchRow(shown),
  )
}
