import type { Message } from '@sand/chats/contract'
import type { EntryView, EntryViews } from './contract'

const messageView: EntryView = { type: 'message', message: entry => entry.data as Message }

export const createViews = (): EntryViews => {
  const views = new Map<string, EntryView>([[messageView.type, messageView]])
  return {
    register(view) {
      views.set(view.type, view)
      return () => {
        if (views.get(view.type) === view) views.delete(view.type)
      }
    },
    get: type => views.get(type),
  }
}
