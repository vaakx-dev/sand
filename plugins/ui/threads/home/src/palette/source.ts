import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { StartParts } from '../launch/start'
import { newChatPage, projectItems } from './projects'
import { sessionActions } from './session'
import { sessionItems } from './sessions'

const newChatItem = (parts: StartParts, group: string): PaletteItem => ({
  id: 'session:new-chat',
  group,
  icon: 'compose',
  label: 'New chat…',
  search: 'new chat thread start project',
  page: () => newChatPage(parts),
})

export const sessionSource = (parts: StartParts, kit: Kit): PaletteSource => ({
  id: 'sessions',
  order: 10,
  items(query) {
    const { ctx, shell, threads } = parts
    if (query.startsWith('/')) return []
    const current = threads.current()
    const actions = current ? sessionActions(kit, threads, current) : []
    if (!query.trim()) return [newChatItem(parts, ''), ...actions, ...sessionItems(ctx, shell, threads, 'Recent threads').slice(0, 5)]
    return [newChatItem(parts, 'Actions'), ...actions.map(item => ({ ...item, group: 'Actions' })), ...projectItems(parts), ...sessionItems(ctx, shell, threads, 'Threads')]
  },
})
