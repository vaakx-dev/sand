import type { WorktreeState } from '../contract'
import { sig } from '@sand/dom'
import type { WorktreeClient } from './client'

const freshMs = 15_000

interface Known {
  at: number
  state: WorktreeState | null
}

export const createStates = (client: WorktreeClient) => {
  const known = new Map<string, Known>()
  const loading = new Map<string, Promise<WorktreeState | null>>()
  const version = sig(0)
  const keyOf = (cwd: string, device?: string) => `${device ?? ''}\0${cwd}`

  const refresh = (cwd: string, device?: string) => {
    const key = keyOf(cwd, device)
    const running = loading.get(key)
    if (running) return running
    const load = client
      .list(cwd, device)
      .catch(() => known.get(key)?.state ?? null)
      .then(state => {
        known.set(key, { at: Date.now(), state })
        loading.delete(key)
        version.update(value => value + 1)
        return state
      })
    loading.set(key, load)
    return load
  }

  return {
    version,
    refresh,
    get(cwd: string, device?: string) {
      if (!cwd) return null
      const entry = known.get(keyOf(cwd, device))
      if (!entry || Date.now() - entry.at > freshMs) void refresh(cwd, device)
      return entry?.state
    },
    forget() {
      for (const entry of known.values()) entry.at = 0
      version.update(value => value + 1)
    },
  }
}

export type States = ReturnType<typeof createStates>
