import type { UserContent } from '@sand/chats/contract'
import type { Held } from '@sand/attachments/web/contract'
import type { Draft, DraftStore } from '../contract'

export interface Saved extends Omit<Draft, 'items'> {
  items: Held[]
}

const empty: Saved = { text: '', items: [] }

export const isBlank = (saved: Saved) => !saved.text.trim() && !saved.items.length

const newer = (local: Saved | undefined, far: Draft | undefined) => ((far?.updated ?? 0) > (local?.updated ?? 0) ? far : local)

export const createStore = (remote: () => DraftStore | undefined, upload: (items: Held[]) => Promise<UserContent[]>) => {
  const memory = new Map<string, Saved>()
  const versions = new Map<string, number>()

  const send = async (key: string, saved: Saved, version: number) => {
    const found = remote()
    if (!found) return
    const draft = isBlank(saved) ? undefined : { ...saved, items: await upload(saved.items) }
    if (versions.get(key) === version) await found.write(key, draft)
  }

  const save = (key: string, saved: Saved) => {
    const version = (versions.get(key) ?? 0) + 1
    versions.set(key, version)
    memory.set(key, { ...saved, updated: saved.updated ?? Date.now() })
    void send(key, saved, version).catch(() => {})
  }

  return {
    save,
    remove: (key: string) => save(key, empty),
    peek: (key: string) => memory.get(key),
    async load(key: string): Promise<Saved> {
      const far = await remote()
        ?.read(key)
        .catch(() => undefined)
      return newer(memory.get(key), far) ?? empty
    },
    all: async () => (await remote()?.all().catch(() => undefined)) ?? [],
  }
}
