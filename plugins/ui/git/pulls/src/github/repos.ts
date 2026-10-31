import { githubRepo } from '@sand/github/contract'
import { sig } from '@vaakx-dev/vrui'
import type { PullsContext } from '../inject'
import { onReconnect } from '../reconnect'

const keepMs = 60_000

interface Folder {
  cwd: string
  device: string
}

interface Known {
  repo: string | null
  until: number
}

const keyOf = ({ cwd, device }: Folder) => `${device}\u0000${cwd}`

export const githubRepos = (ctx: PullsContext) => {
  const known = sig<ReadonlyMap<string, Known>>(new Map())
  const folders = new Map<string, Folder>()
  const loading = new Set<string>()

  const put = (key: string, repo: string | null) => {
    const next = new Map(known.get())
    next.set(key, { repo, until: Date.now() + keepMs })
    known.set(next)
  }

  const load = async (folder: Folder) => {
    const key = keyOf(folder)
    if (loading.has(key)) return
    loading.add(key)
    folders.set(key, folder)
    try {
      put(key, (await ctx.wire.call(githubRepo, { cwd: folder.cwd }, folder.device))?.repo ?? null)
    } catch {
      put(key, null)
    } finally {
      loading.delete(key)
    }
  }

  const of = (folder: Folder) => {
    const found = known.get().get(keyOf(folder))
    if (!found || found.until <= Date.now()) void load(folder)
    return found?.repo ?? undefined
  }

  const isGitHub = (folder: Folder) => Boolean(of(folder))

  onReconnect(ctx, device => {
    for (const folder of folders.values()) if (!device || folder.device === device) void load(folder)
  })

  return { of, isGitHub }
}

export type GitHubRepos = ReturnType<typeof githubRepos>
