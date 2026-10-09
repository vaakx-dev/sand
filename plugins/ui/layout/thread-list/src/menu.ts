import type { Drafts, NavAction, Threads } from '@sand/protocol'

export const threadMenu = (threads: Threads, id: string): NavAction[] => {
  const thread = threads.get(id)
  if (!thread || thread.info.kind === 'agent') return []
  const pinned = Boolean(thread.info.pinned)
  const settled = Boolean(thread.info.settled)
  const pin: NavAction = { id: 'pin', label: pinned ? 'Unpin' : 'Pin', icon: 'pin', run: () => void threads.pin(id, !pinned) }
  const settle: NavAction = { id: 'settle', label: settled ? 'Un-settle' : 'Settle', icon: settled ? 'up' : 'check', run: () => void threads.settle(id, !settled) }
  return [pin, settle]
}

export const draftMenu = (drafts: Drafts, id: string): NavAction[] => [{ id: 'discard', label: 'Discard draft', icon: 'x', run: () => drafts.remove(id) }]
