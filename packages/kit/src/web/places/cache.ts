import { collectScope, onTimeout } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export type PlaceOwner = Pick<Context, 'effect'>

export type PlaceLoad<T> = (cwd: string, device: string) => Promise<T | undefined>

export interface PlaceCacheOptions<T> {
  load: PlaceLoad<T>
  changed(): void
  freshMs?: number
  ready?(): boolean
}

export interface PlaceCache<T> {
  of(cwd: string, device: string): T | undefined
  refresh(cwd: string, device: string): Promise<T | undefined>
  forget(): void
}

interface Known<T> {
  at: number
  value: T | undefined
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export const placeCache = <T>(owner: PlaceOwner, { load, changed, freshMs = Infinity, ready = () => true }: PlaceCacheOptions<T>): PlaceCache<T> => {
  const known = new Map<string, Known<T>>()
  const loading = new Map<string, Promise<T | undefined>>()
  const again = new Set<string>()
  let pending: (() => void) | undefined
  let live = true
  owner.effect(() => () => {
    live = false
    pending?.()
  })

  const keyOf = (cwd: string, device: string) => `${device}\0${cwd}`

  const flush = () => {
    pending = undefined
    changed()
  }

  const announce = () => {
    if (live) pending ??= collectScope(() => onTimeout(flush)).value
  }

  const settle = (cwd: string, device: string, value: T | undefined) => {
    const key = keyOf(cwd, device)
    loading.delete(key)
    const before = known.get(key)?.value
    known.set(key, { at: Date.now(), value })
    if (!same(before, value)) announce()
    if (again.delete(key)) void fetch(cwd, device)
    return value
  }

  const fetch = (cwd: string, device: string): Promise<T | undefined> => {
    const key = keyOf(cwd, device)
    const running = loading.get(key)
    if (running) return running
    const next = load(cwd, device).then(
      value => settle(cwd, device, value),
      () => settle(cwd, device, known.get(key)?.value),
    )
    loading.set(key, next)
    return next
  }

  return {
    of(cwd, device) {
      if (!cwd) return undefined
      const entry = known.get(keyOf(cwd, device))
      if ((!entry || Date.now() - entry.at > freshMs) && ready()) void fetch(cwd, device)
      return entry?.value
    },
    async refresh(cwd, device) {
      const key = keyOf(cwd, device)
      if (!cwd || !ready()) return known.get(key)?.value
      if (loading.has(key)) again.add(key)
      return fetch(cwd, device)
    },
    forget() {
      for (const entry of known.values()) entry.at = 0
      announce()
    },
  }
}
