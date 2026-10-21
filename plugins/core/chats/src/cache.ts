export interface EntryCache {
  touch(id: string, unload: () => void): void
  forget(id: string): void
}

export const createEntryCache = (limit: number, pinned: (id: string) => boolean): EntryCache => {
  const loaded = new Map<string, () => void>()

  const trim = (kept: string) => {
    for (const [id, unload] of loaded) {
      if (loaded.size <= limit) return
      if (id === kept || pinned(id)) continue
      loaded.delete(id)
      unload()
    }
  }

  return {
    touch(id, unload) {
      loaded.delete(id)
      loaded.set(id, unload)
      trim(id)
    },
    forget: id => void loaded.delete(id),
  }
}
