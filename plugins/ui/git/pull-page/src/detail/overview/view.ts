import { div } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'
import { checksBlock } from './checks'
import { conversationBlock } from './conversation'
import { descriptionBlock } from './description'
import { replyBox } from './reply'
import { reviewersBlock } from './reviewers'

export const overviewView = (shown: Shown) =>
  div(
    { class: 'flex flex-col gap-4 px-4 pt-3 pb-8' },
    checksBlock(shown),
    reviewersBlock(shown),
    descriptionBlock(shown),
    conversationBlock(shown),
    replyBox(shown),
  )
