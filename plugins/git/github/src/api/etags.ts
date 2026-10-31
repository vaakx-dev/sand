interface Tagged {
  etag: string
  body: unknown
}

export const createEtags = (most = 300) => {
  const known = new Map<string, Tagged>()

  return {
    get(key: string) {
      const found = known.get(key)
      if (!found) return undefined
      known.delete(key)
      known.set(key, found)
      return found
    },
    set(key: string, etag: string, body: unknown) {
      known.delete(key)
      known.set(key, { etag, body })
      if (known.size <= most) return
      const oldest = known.keys().next().value
      if (oldest !== undefined) known.delete(oldest)
    },
    clear: () => known.clear(),
  }
}
