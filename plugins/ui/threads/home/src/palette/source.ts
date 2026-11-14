import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { newThread } from '../launch/launch'
import { startChat, type StartParts } from '../launch/start'
import { archivedItems, projectItems } from './projects'
import { sessionActions } from './session'
import { sessionItems, type SessionParts } from './sessions'

const newChatItem = (parts: StartParts, group: string): PaletteItem => ({
  id: 'session:new-thread',
  group,
  icon: 'compose',
  label: 'New thread',
  search: 'new thread chat start project',
  run: () => newThread(parts),
})

export const sessionSource = (parts: SessionParts, kit: Kit): PaletteSource => ({
  id: 'sessions',
  order: 10,
  items(query) {
    const { threads } = parts
    if (query.startsWith('/')) return []
    const current = threads.current()
    const actions = current ? sessionActions(parts.ctx, kit, threads, current) : []
    if (!query.trim()) return [...actions, ...sessionItems(parts, 'Recent').slice(0, 5)]
    return [newChatItem(parts, 'Actions'), ...actions.map(item => ({ ...item, group: 'Actions' })), ...projectItems(parts, startChat(parts)), ...archivedItems(parts, startChat(parts)), ...sessionItems(parts, 'Chats')]
  },
})
