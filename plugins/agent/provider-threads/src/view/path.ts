import type { Entry } from '@sand/chats/contract'
import type { EntryViews, ViewReset } from '@sand/engine/contract'

export interface Path {
  entries: Entry[]
  index: Map<string, number>
  views: EntryViews
}

export const pathOf = (entries: Entry[], views: EntryViews): Path => ({ entries, index: new Map(entries.map((entry, at) => [entry.id, at])), views })

export const resetOf = (path: Path, entry: Entry): ViewReset | undefined => path.views.get(entry.type)?.resets?.(entry)

export const historyBefore = (path: Path, entry: string) => path.entries.slice(0, path.index.get(entry)).some(found => path.views.get(found.type))
