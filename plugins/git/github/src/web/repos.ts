import { pcHello, type Wire } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type FolderRepo, type GitHubFolder, githubRepo } from '../contract'

const keyOf = ({ cwd, device }: GitHubFolder) => `${device}\u0000${cwd}`

export const repoBook = (ctx: Context, wire: Wire) => {
  const repos = sig<ReadonlyMap<string, FolderRepo | null>>(new Map())
  const folders = new Map<string, GitHubFolder>()

  const put = (key: string, repo: FolderRepo | null) => repos.update(current => new Map(current).set(key, repo))

  const look = (folder: GitHubFolder) => {
    const key = keyOf(folder)
    folders.set(key, folder)
    wire
      .call(githubRepo, { cwd: folder.cwd }, folder.device)
      .then(found => put(key, found))
      .catch(error => {
        ctx.report(error)
        put(key, null)
      })
  }

  const folderRepo = (folder: GitHubFolder) => {
    const key = keyOf(folder)
    if (!folders.has(key)) look(folder)
    return repos.get().get(key)
  }

  const repoOf = (folder: GitHubFolder) => {
    const found = folderRepo(folder)
    return found === null ? null : found?.repo
  }

  ctx.on(pcHello, device => {
    for (const folder of folders.values()) if (folder.device === device) look(folder)
  })

  return { folderRepo, repoOf }
}
