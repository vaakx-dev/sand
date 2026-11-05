import type { SessionSummary } from '@sand/chats/contract'
import type { Trigger, TriggerItem } from '@sand/composer/contract'
import { folderName, uuid } from '@sand/util'
import type { Threads } from '@sand/web-client/contract'
import { pickThreads } from './pick'

interface ThreadItem extends TriggerItem {
  info: SessionSummary
}

export const threadTrigger = (threads: Threads): Trigger<ThreadItem> => ({
  char: '@',
  label: 'threads',
  items: query =>
    pickThreads(
      threads.list().map(thread => thread.info),
      query,
      threads.current()?.id,
    ).map((info): ThreadItem => ({ label: info.title, description: folderName(info.cwd), icon: 'message', info })),
  accept: ({ info }) => ({ v: 1, id: uuid(), kind: 'thread', label: info.title, data: { id: info.id } }),
})
