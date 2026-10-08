import type { Context } from 'drydock'

const fresh = 15000

export const branches = (ctx: Context, changed: () => void) => {
  const known = new Map<string, { at: number; name?: string }>()
  const loading = new Set<string>()

  const load = async (cwd: string) => {
    const wire = ctx.wire
    if (!wire || wire.state() !== 'open' || loading.has(cwd)) return
    loading.add(cwd)
    try {
      const name = await wire.call<string | undefined>({ type: 'git.branch', cwd })
      const before = known.get(cwd)?.name
      known.set(cwd, { at: Date.now(), name: name ?? undefined })
      if (before !== name) changed()
    } catch {
      known.set(cwd, { at: Date.now() })
    } finally {
      loading.delete(cwd)
    }
  }

  return (cwd: string | undefined) => {
    if (!cwd) return undefined
    const entry = known.get(cwd)
    if (!entry || Date.now() - entry.at > fresh) void load(cwd)
    return entry?.name
  }
}
