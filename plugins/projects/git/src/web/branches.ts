import type { Context } from 'drydock'
import type { Branches } from '../contract'

const freshMs = 15000

interface Known {
  at: number
  name?: string
}

export const createBranches = (ctx: Context<'wire'>): Branches => {
  const known = new Map<string, Known>()
  const loading = new Set<string>()

  const load = async (key: string, cwd: string, device?: string) => {
    if (ctx.wire.state() !== 'open' || loading.has(key)) return
    loading.add(key)
    try {
      const name = (await ctx.wire.call<string | null | undefined>({ type: 'git.branch', cwd }, device)) ?? undefined
      const before = known.get(key)?.name
      known.set(key, { at: Date.now(), name })
      if (before !== name) ctx.emit('branches.change')
    } catch {
      known.set(key, { at: Date.now(), name: known.get(key)?.name })
    } finally {
      loading.delete(key)
    }
  }

  return {
    of(cwd, device) {
      if (!cwd) return undefined
      const key = `${device ?? ''}\0${cwd}`
      const entry = known.get(key)
      if (!entry || Date.now() - entry.at > freshMs) void load(key, cwd, device || undefined)
      return entry?.name
    },
  }
}
