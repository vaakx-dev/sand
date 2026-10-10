import type { Context } from 'drydock'
import type { GitStatus, GitStatuses } from '../contract'

const freshMs = 15000

interface Known {
  at: number
  status?: GitStatus
}

const same = (a: GitStatus | undefined, b: GitStatus | undefined) => JSON.stringify(a) === JSON.stringify(b)

export const createGitStatus = (ctx: Context<'wire'>): GitStatuses => {
  const known = new Map<string, Known>()
  const loading = new Set<string>()
  const again = new Set<string>()

  const keyOf = (device: string, cwd: string) => `${device}\0${cwd}`

  const settle = (cwd: string, device: string, status: GitStatus | undefined) => {
    const key = keyOf(device, cwd)
    loading.delete(key)
    const before = known.get(key)?.status
    known.set(key, { at: Date.now(), status })
    if (!same(before, status)) ctx.emit('gitStatus.change')
    if (again.delete(key)) load(cwd, device)
  }

  const load = (cwd: string, device: string, forced = false) => {
    const key = keyOf(device, cwd)
    if (!cwd || ctx.wire.state() !== 'open') return
    if (loading.has(key)) return void (forced && again.add(key))
    loading.add(key)
    ctx.wire
      .call<GitStatus | null>({ type: 'git.status', cwd }, device)
      .then(
        status => settle(cwd, device, status ?? undefined),
        () => settle(cwd, device, known.get(key)?.status),
      )
  }

  return {
    of(cwd, device) {
      if (!cwd) return undefined
      const entry = known.get(keyOf(device ?? '', cwd))
      if (!entry || Date.now() - entry.at > freshMs) load(cwd, device ?? '')
      return entry?.status
    },
    refresh: (cwd, device) => load(cwd, device ?? '', true),
    locals: async (cwd, device) => (await ctx.wire.call<string[]>({ type: 'git.locals', cwd }, device ?? '').catch(() => [])) ?? [],
  }
}
