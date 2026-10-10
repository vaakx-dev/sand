import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import type { Context } from 'drydock'
import { openDraft } from '../draft'
import { currentPlace } from './places'
import { newThreadPage, projectItems } from './projects'
import { sessionActions } from './session'
import { sessionItems } from './sessions'

const startActions = (ctx: Context<'threads'>, group: string): PaletteItem[] => {
  const here = currentPlace(ctx)
  return [
    {
      id: 'session:new-here',
      group,
      icon: 'compose',
      label: `New thread in ${here.name}`,
      search: 'new thread start create',
      run: () => openDraft(ctx, here.path, here.device),
    },
    { id: 'session:new-in', group, icon: 'compose', label: 'New thread in…', search: 'new thread project pick choose', page: () => newThreadPage(ctx) },
  ]
}

export const sessionSource = (ctx: Context<'threads'>): PaletteSource => ({
  id: 'sessions',
  order: 10,
  items(query) {
    if (query.startsWith('/')) return []
    const current = ctx.threads.current()
    const actions = current ? sessionActions(ctx, current) : []
    if (!query.trim()) return [...startActions(ctx, ''), ...actions, ...sessionItems(ctx, 'Recent threads').slice(0, 5)]
    return [...startActions(ctx, 'Actions'), ...actions.map(item => ({ ...item, group: 'Actions' })), ...projectItems(ctx), ...sessionItems(ctx, 'Threads')]
  },
})
