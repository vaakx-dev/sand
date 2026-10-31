import type { ReviewFile } from '@sand/pull-review/contract'
import { plural } from '@sand/util'
import { derive, show, type Sig } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'

export const viewedToggle = ({ kit, files }: CodeTab, file: Sig<ReviewFile>, open: Sig<boolean>) => {
  const viewed = () => file.get().viewed === 'viewed'
  const toggle = () => {
    const next = !viewed()
    open.set(!next)
    void files.markViewed(file.get().path, next)
  }
  return kit.quietButton(
    { size: 'sm', role: 'checkbox', 'aria-checked': () => String(viewed()), title: 'Mark as viewed on GitHub', onClick: toggle },
    kit.checkMark(viewed),
    'Viewed',
  )
}

export const fileTags = ({ kit, pending }: CodeTab, file: Sig<ReviewFile>) => {
  const comments = derive(() => pending.review.get().comments.filter(comment => comment.path === file.get().path).length)
  return [
    show(
      () => file.get().viewed === 'changed',
      () => kit.badge('warning', 'Changed since viewed'),
    ),
    show(
      () => comments.get() > 0,
      () => kit.badge('accent', () => plural(comments.get(), 'comment')),
    ),
  ]
}
