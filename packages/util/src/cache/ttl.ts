export interface TtlCacheOptions<T> {
  ttl(value: T): number
  most: number
  stored?(key: string, value: T, previous: T | undefined): void
}

export interface TtlCache<T> {
  get(key: string, load: () => Promise<T>, fresh?: boolean): Promise<T>
  refresh(key: string, load: () => Promise<T>): Promise<T>
  set(key: string, value: T): void
  peek(key: string): T | undefined
  isLoading(key: string): boolean
  delete(key: string): boolean
  clear(): void
}

interface Entry<T> {
  value: T
  at: number
}

export const ttlCache = <T>(options: TtlCacheOptions<T>): TtlCache<T> => {
  const entries = new Map<string, Entry<T>>()
  const loading = new Map<string, Promise<T>>()

  const set = (key: string, value: T) => {
    const previous = entries.get(key)?.value
    entries.delete(key)
    entries.set(key, { value, at: Date.now() })
    if (entries.size > options.most) {
      const oldest = entries.keys().next().value
      if (oldest !== undefined) entries.delete(oldest)
    }
    options.stored?.(key, value, previous)
  }

  const start = (key: string, load: () => Promise<T>) => {
    const next: Promise<T> = load()
      .then(value => {
        if (loading.get(key) === next) set(key, value)
        return value
      })
      .finally(() => {
        if (loading.get(key) === next) loading.delete(key)
      })
    loading.set(key, next)
    return next
  }

  const isCurrent = (entry: Entry<T>) => Date.now() - entry.at < options.ttl(entry.value)

  return {
    get(key, load, fresh) {
      const found = entries.get(key)
      if (!fresh && found && isCurrent(found)) return Promise.resolve(found.value)
      return loading.get(key) ?? start(key, load)
    },
    refresh: start,
    set,
    peek: key => entries.get(key)?.value,
    isLoading: key => loading.has(key),
    delete: key => entries.delete(key),
    clear() {
      entries.clear()
      loading.clear()
    },
  }
}
