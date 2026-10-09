import type { Command } from '@sand/server/contract'
import type { SessionsContext } from '../types'
import { listed, pickItems } from './items'
import { fresh, nextSort, options, title, type View } from './view'

const remove = (ctx: SessionsContext, view: View, id: string): View => {
  if (id === ctx.ui.session()?.id) return { ...view, hint: 'Cannot delete the currently active thread' }
  const session = ctx.sessions.open(id)
  if (session && ctx.loop?.active(session)) return { ...view, hint: 'Wait for that thread to finish its turn' }
  ctx.sessions.remove(id)
  return { ...view, selected: undefined, hint: 'Deleted thread' }
}

const rename = async (ctx: SessionsContext, view: View, id: string): Promise<View> => {
  const session = ctx.sessions.open(id)
  if (!session) return view
  const name = (await ctx.ui.input('Rename thread', session.title ?? ''))?.replace(/\s+/g, ' ').trim()
  if (!name) return view
  session.rename(name)
  return { ...view, hint: `Renamed to ${name}` }
}

const act = async (ctx: SessionsContext, view: View, action: string, id?: string): Promise<View> => {
  switch (action) {
    case 'scope':
      return { ...view, all: !view.all }
    case 'sort':
      return { ...view, sort: nextSort(view.sort) }
    case 'named':
      return { ...view, named: !view.named }
    case 'ids':
      return { ...view, ids: !view.ids }
    case 'delete':
      return id ? remove(ctx, view, id) : view
    case 'rename':
      return id ? rename(ctx, view, id) : view
  }
  return view
}

export const resumeCommand = (ctx: SessionsContext): Command => ({
  name: 'resume',
  title: 'Resume a thread',
  description: 'Browse, resume, rename or delete previous threads',
  async run() {
    let view = fresh
    while (true) {
      const items = pickItems(listed(ctx, view), view, ctx.ui.session()?.id)
      const selected = Math.max(0, items.findIndex(item => item.value === view.selected))
      const picked = await ctx.ui.choose(title, items, options(view, selected))
      if (!picked) return
      view = { ...view, query: picked.query, selected: picked.value, hint: undefined }
      if (picked.action) {
        view = await act(ctx, view, picked.action, picked.value)
        continue
      }
      const session = picked.value ? ctx.sessions.open(picked.value) : undefined
      if (session && session.id !== ctx.ui.session()?.id) ctx.ui.open(session)
      return
    }
  },
})
