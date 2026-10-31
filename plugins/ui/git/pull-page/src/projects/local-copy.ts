import { repoSlug } from '@sand/github/contract'
import type { LocalCopy } from '../contract'
import type { PageContext } from '../inject'

export const localCopy = (ctx: PageContext, repo: string): LocalCopy | undefined => {
  const wanted = repo.toLowerCase()
  const copies = ctx.projects
    .groups({ hidden: true })
    .filter(group => repoSlug(group.remote)?.toLowerCase() === wanted)
    .flatMap(group => group.locations)
    .filter(entry => !entry.missing && ctx.pcs.online(entry.device))
  const found = copies.find(entry => ctx.pcs.get(entry.device)?.home) ?? copies[0]
  return found && { cwd: found.path, device: found.device }
}
