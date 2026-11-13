import type { Kit } from '@sand/ui-kit/contract'
import { span, type Sig } from '@vaakx-dev/vrui'
import { agoText } from '../format'
import type { Notice } from '../model'

const noticeText = ({ pc, failure, at }: Notice) => {
  if (failure) return `${pc.name} didn't answer`
  return at ? `${pc.name} is offline · usage from ${agoText(at)}` : `${pc.name} is offline · no usage yet`
}

export const offlineNotes = ({ metaLine }: Kit, notices: Notice[], now: Sig<number>) =>
  notices.map(notice =>
    span(
      { title: notice.failure },
      metaLine(() => {
        now.get()
        return noticeText(notice)
      }),
    ),
  )
