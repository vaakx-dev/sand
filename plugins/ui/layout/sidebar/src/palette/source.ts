import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { currentPlace } from './places'
import { newThreadPage, openDraft, projectItems } from './projects'
import { sessionActions } from './session'
import { sessionItems } from './sessions'

const startActions = (ctx: Context, threads: Threads, group: string): PaletteItem[] => {
  const here = currentPlace(ctx, threads)
  return [
    {
      id: 'session:new-here',
      group,
      icon: 'compose',
      label: `New thread in ${here.name}`,
      search: 'new thread start create',
      run: () => openDraft(ctx, threads, here.path, here.device),
    },
    { id: 'session:new-in', group, icon: 'compose', label: 'New thread in…', search: 'new thread project pick choose', page: () => newThreadPage(ctx, threads) },
  ]
}

export const sessionSource = (ctx: Context, kit: Kit, threads: Threads): PaletteSource => ({
  id: 'sessions',
  order: 10,
  items(query) {
    if (query.startsWith('/')) return []
    const current = threads.current()
    const actions = current ? sessionActions(kit, threads, current) : []
    if (!query.trim()) return [...startActions(ctx, threads, ''), ...actions, ...sessionItems(ctx, threads, 'Recent threads').slice(0, 5)]
    return [...startActions(ctx, threads, 'Actions'), ...actions.map(item => ({ ...item, group: 'Actions' })), ...projectItems(ctx, threads), ...sessionItems(ctx, threads, 'Threads')]
  },
})
