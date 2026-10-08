import { Sig } from '@vaakx-dev/vrui'

const load = <T>(key: string, fallback: T, valid: (value: unknown) => boolean): T => {
  try {
    const saved = localStorage.getItem(key)
    if (saved === null) return fallback
    const value: unknown = JSON.parse(saved)
    return valid(value) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

class StoredSig<T> extends Sig<T> {
  readonly key: string

  constructor(key: string, value: T) {
    super(value)
    this.key = key
  }

  override set(value: T) {
    super.set(value)
    save(this.key, value)
  }
}

const sameType = (fallback: unknown) => (value: unknown) => typeof value === typeof fallback && Array.isArray(value) === Array.isArray(fallback)

export const stored = <T>(key: string, fallback: T, valid: (value: unknown) => boolean = sameType(fallback)): Sig<T> =>
  new StoredSig(key, load(key, fallback, valid))
