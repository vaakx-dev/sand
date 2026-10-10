import type { DraftTarget } from '@sand/web-client/contract'
import type { ThreadDraft } from '../contract'
import type { Context } from 'drydock'
import type { Saved } from './store'

export const createListed = (ctx: Context) => {
  const entries = new Map<string, ThreadDraft>()
  const changed = () => ctx.emit('drafts.change')
  return {
    has: (id: string) => entries.has(id),
    updated: (id: string) => entries.get(id)?.updated,
    list: () => [...entries.values()].sort((a, b) => b.updated - a.updated),
    set(target: DraftTarget, saved: Saved, updated = Date.now()) {
      const known = entries.get(target.id)
      const same = known && known.cwd === target.cwd && known.device === target.device
      if (same && known.text === saved.text && known.attachments === saved.items.length) return
      entries.set(target.id, { ...target, text: saved.text, attachments: saved.items.length, updated })
      changed()
    },
    delete(id: string) {
      if (entries.delete(id)) changed()
    },
  }
}
