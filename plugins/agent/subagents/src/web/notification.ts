import { notificationField } from '@sand/chats/contract'
import type { NoticeKind } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import type { JobWatch } from './jobs'
import { subAgentOf } from './tool'

export const jobNotice = (kit: Kit, watch: JobWatch, chats: () => Threads | undefined): NoticeKind => ({
  icon: 'bot',
  actions(text, thread) {
    const origin = watch.find(notificationField(text, 'job'))?.origin
    const found = origin ? subAgentOf(chats(), thread, origin) : undefined
    return found && kit.iconButton({ size: 'sm', title: 'Open sub-agent', 'aria-label': 'Open sub-agent', onClick: () => void chats()?.select(found.id) }, kit.icon('right', 'sm'))
  },
})
