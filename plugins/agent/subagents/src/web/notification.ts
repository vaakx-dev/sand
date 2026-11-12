import { notificationField } from '@sand/chats/contract'
import type { NoticeKind } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'

export const threadNotice = (kit: Kit, open: (thread: string) => void): NoticeKind => ({
  icon: 'bot',
  actions(text) {
    const thread = notificationField(text, 'thread')
    return thread && kit.iconButton({ size: 'sm', title: 'Open', 'aria-label': 'Open', onClick: () => open(thread) }, kit.icon('right', 'sm'))
  },
})
