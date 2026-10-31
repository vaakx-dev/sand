import { type Pcs, pcsChange } from '@sand/devices-contract'
import { type Projects, projectsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { Context } from 'drydock'
import type { GitHubFolder } from '../contract'

interface CopyParts {
  pcs: Pcs
  projects: Projects
  repoOf(folder: GitHubFolder): string | null | undefined
}

export const localCopies = (ctx: Context, { pcs, projects, repoOf }: CopyParts) => {
  const changes = pulse(ctx, [projectsChange, pcsChange])

  return (repo: string): GitHubFolder | undefined => {
    changes.version.get()
    const wanted = repo.toLowerCase()
    const copies = projects
      .groups({ hidden: true })
      .flatMap(group => group.locations)
      .filter(entry => !entry.missing && pcs.online(entry.device))
      .map(entry => ({ cwd: entry.path, device: entry.device }))
      .filter(folder => repoOf(folder)?.toLowerCase() === wanted)
    return copies.find(folder => pcs.get(folder.device)?.home) ?? copies[0]
  }
}
