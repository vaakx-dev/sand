import type { ChangeState, ThreadChanges } from '@sand/changes/contract'
import { textOf, type Entry, type Message } from '@sand/chats/contract'
import { pulse } from '@sand/reactive'
import type { Status } from '@sand/ui-shell/contract'
import { oneLine } from '@sand/util'
import { threadChange, threadSelect, threadsChange, type Thread } from '@sand/web-client/contract'
import type { ChatContext } from '../context'
import type { ThreadLive } from '../contract'
import { threadChanges } from './changes'

const merges: Record<ChangeState, Status | undefined> = { none: undefined, ready: 'ready', merging: 'merging', merged: 'merged', conflict: 'waiting', failed: 'waiting' }

const mergeTrouble: Partial<Record<ChangeState, string>> = { conflict: 'Merge conflict', failed: 'Merge failed' }

const troubleOf = (changes: ThreadChanges | undefined) => (changes ? changes.reason || mergeTrouble[changes.state] || '' : '')

const statusOf = (thread: Thread, changes: ThreadChanges | undefined): Status => {
  const merge = changes && merges[changes.state]
  if (thread.waiting || merge === 'waiting') return 'waiting'
  if (thread.running) return 'running'
  return merge ?? 'done'
}

const replyText = (entry: Entry) => {
  if (entry.type !== 'message') return ''
  const message = entry.data as Message
  return message.role === 'assistant' ? textOf(message.content).trim() : ''
}

const lastReply = (path: Entry[]) => {
  const found = path.findLast(entry => replyText(entry) !== '')
  return found ? oneLine(replyText(found).split('\n')[0] ?? '') : ''
}

const noteOf = (ctx: ChatContext, thread: Thread, status: Status, changes: ThreadChanges | undefined) => {
  if (thread.waiting) return thread.waiting.title
  if (status === 'waiting') return troubleOf(changes)
  if (status === 'running') return 'Working'
  if (status === 'ready' && changes) return `+${changes.add} −${changes.del}`
  return lastReply(ctx.threads.path(thread.id))
}

export const threadLive = (ctx: ChatContext) => {
  const changesOf = threadChanges(ctx)
  const version = pulse(ctx, [threadsChange, threadSelect])
  ctx.on(threadChange, version.schedule)
  return (id: string): ThreadLive | undefined => {
    version.version.get()
    const thread = ctx.threads.get(id)
    if (!thread) return undefined
    const changes = changesOf(id)
    const status = statusOf(thread, changes)
    return {
      id,
      title: thread.info.title || 'Untitled thread',
      status,
      note: noteOf(ctx, thread, status, changes),
      at: status === 'running' ? (thread.started ?? thread.info.updated) : thread.info.updated,
    }
  }
}
