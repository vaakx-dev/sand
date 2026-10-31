import { pcHello, type Wire } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type GitHubFolder, githubRepo } from '../contract'

const keyOf = ({ cwd, device }: GitHubFolder) => `${device}\u0000${cwd}`

export const repoBook = (ctx: Context, wire: Wire) => {
  const repos = sig<ReadonlyMap<string, string | null>>(new Map())
  const folders = new Map<string, GitHubFolder>()

  const put = (key: string, repo: string | null) => repos.update(current => new Map(current).set(key, repo))

  const look = (folder: GitHubFolder) => {
    const key = keyOf(folder)
    folders.set(key, folder)
    wire
      .call(githubRepo, { cwd: folder.cwd }, folder.device)
      .then(found => put(key, found?.repo ?? null))
      .catch(error => {
        ctx.report(error)
        put(key, null)
      })
  }

  const repoOf = (folder: GitHubFolder) => {
    const key = keyOf(folder)
    if (!folders.has(key)) look(folder)
    return repos.get().get(key)
  }

  ctx.on(pcHello, device => {
    for (const folder of folders.values()) if (folder.device === device) look(folder)
  })

  return { repoOf }
}
