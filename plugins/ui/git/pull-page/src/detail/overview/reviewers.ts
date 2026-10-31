import type { ReviewerState } from '@sand/pull-detail/contract'
import type { IconName, Tone } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, span } from '@vaakx-dev/vrui'
import { isLive } from '../../pull/look'
import { reviewersSheet } from '../reviewers/sheet'
import type { Shown } from '../shown'

interface ReviewerLook {
  tone: Tone
  icon: IconName
  text: string
}

const looks: Record<ReviewerState, ReviewerLook> = {
  approved: { tone: 'success', icon: 'check', text: 'approved' },
  changes: { tone: 'danger', icon: 'message', text: 'requested changes' },
  commented: { tone: 'neutral', icon: 'message', text: 'commented' },
  pending: { tone: 'warning', icon: 'clock', text: 'review requested' },
  dismissed: { tone: 'neutral', icon: 'x', text: 'review dismissed' },
}

interface ReviewerRow {
  login: string
  state: ReviewerState
}

const rowsOf = (shown: Shown): ReviewerRow[] => {
  const pull = shown.pull()
  const reviewed = pull.reviewers.map(({ login, state }) => ({ login, state }))
  const waiting = pull.requested.filter(login => !reviewed.some(each => each.login === login)).map(login => ({ login, state: 'pending' as const }))
  return [...reviewed, ...waiting]
}

const reviewerLine = (shown: Shown, row: () => ReviewerRow) => {
  const { kit } = shown.parts
  return kit.statusLine(
    {
      mark: dynamicChild(
        () => looks[row().state],
        look => span({ class: ['inline-flex shrink-0', kit.toneText[look.tone]] }, kit.icon(look.icon, 14)),
      ),
      text: span(span({ class: 'text-neutral-100' }, () => row().login), () => ` ${looks[row().state].text}`),
      title: () => `${row().login} ${looks[row().state].text}`,
    },
  )
}

export const reviewersBlock = (shown: Shown) => {
  const { kit } = shown.parts
  const rows = derive(() => rowsOf(shown))
  return div(
    { class: 'flex flex-col gap-1' },
    list(
      rows,
      row => row.login,
      row => reviewerLine(shown, () => row.get()),
      div({ class: 'flex flex-col gap-1' }),
    ),
    div(
      { class: 'flex items-center gap-2' },
      span({ class: 'flex-1 text-xs text-neutral-500' }, () => (rows.get().length ? '' : 'No reviewers yet')),
      isLive(shown.pull().state) && shown.pull().canEdit ? kit.linkButton({ class: 'text-xs', onClick: () => reviewersSheet(shown) }, 'Request review') : null,
    ),
  )
}
