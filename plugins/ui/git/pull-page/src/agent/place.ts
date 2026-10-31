import type { PageContext } from '../inject'
import { githubRepo } from '../projects/repos'

export interface RepoPlace {
  cwd: string
  device: string
}

export const repoPlace = (ctx: PageContext, repo: string): RepoPlace | undefined => {
  const wanted = repo.toLowerCase()
  const copies = ctx.projects
    .groups({ hidden: true })
    .filter(group => githubRepo(group.remote)?.toLowerCase() === wanted)
    .flatMap(group => group.locations)
    .filter(entry => !entry.missing && ctx.pcs.online(entry.device))
  const home = copies.find(entry => ctx.pcs.get(entry.device)?.home)
  const found = home ?? copies[0]
  return found && { cwd: found.path, device: found.device }
}
