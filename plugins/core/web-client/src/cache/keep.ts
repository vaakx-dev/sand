import { writeSaved } from './saved'

export const createKeep = (scope: () => string | undefined) => {
  let restored: Record<string, unknown> = {}
  const written = new Map<string, string>()
  const waiting = new Map<string, unknown>()

  const flush = () => {
    const key = scope()
    if (!key || !waiting.size) return
    const values = [...waiting]
    waiting.clear()
    void writeSaved(key, values).catch(() => {})
  }

  return {
    flush,
    saved: (name: string) => restored[name],
    restore(values: Record<string, unknown>) {
      restored = values
      for (const [name, value] of Object.entries(values)) written.set(name, JSON.stringify(value))
    },
    keep(name: string, value: unknown) {
      const json = JSON.stringify(value)
      if (written.get(name) === json) return
      written.set(name, json)
      waiting.set(name, value)
      flush()
    },
    forget() {
      restored = {}
      written.clear()
      waiting.clear()
    },
  }
}
