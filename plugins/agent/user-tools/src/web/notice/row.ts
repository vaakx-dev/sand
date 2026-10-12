import type { Entry } from '@sand/messages'
import { isRecord } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'

export const noticeRow = ({ callout }: Kit, entry: Entry) => {
  if (!isRecord(entry.data) || typeof entry.data.text !== 'string') return undefined
  return div(
    { class: 'my-3', role: 'note', 'aria-label': 'Notice from sand' },
    callout({ tone: 'neutral', icon: 'bell' }, span({ class: 'min-w-0 text-sm whitespace-pre-wrap wrap-anywhere' }, entry.data.text)),
  )
}
