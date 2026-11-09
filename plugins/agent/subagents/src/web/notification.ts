import { notificationField } from '@sand/chats/contract'
import type { NoticeKind } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'

export const threadNotice = (kit: Kit, chats: () => Threads | undefined): NoticeKind => ({
  icon: 'bot',
  actions(text) {
    const found = chats()?.get(notificationField(text, 'thread'))
    return found && kit.iconButton({ size: 'sm', title: 'Open thread', 'aria-label': 'Open thread', onClick: () => void chats()?.select(found.id) }, kit.icon('right', 'sm'))
  },
})
