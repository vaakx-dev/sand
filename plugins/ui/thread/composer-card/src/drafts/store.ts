import type { DraftTarget } from '@sand/web-client/contract'
import type { Held } from '../attachments/files'
import { deleteDraft, readDraft, readDrafts, writeDraft } from '../integrations/draft-db'

export interface Saved {
  text: string
  items: Held[]
  target?: DraftTarget
  updated?: number
}

const empty: Saved = { text: '', items: [] }

export const isBlank = (saved: Saved) => !saved.text.trim() && !saved.items.length

export const createStore = () => {
  const memory = new Map<string, Saved>()
  const save = (key: string, saved: Saved) => {
    memory.set(key, saved)
    void (isBlank(saved) ? deleteDraft(key) : writeDraft(key, saved)).catch(() => {})
  }
  return {
    save,
    remove: (key: string) => save(key, empty),
    peek: (key: string) => memory.get(key),
    load: async (key: string) => memory.get(key) ?? (await readDraft(key).catch(() => undefined)) ?? empty,
    all: () => readDrafts().catch((): Saved[] => []),
  }
}
