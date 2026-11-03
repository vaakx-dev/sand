import { type Pcs, pcsChange } from '@sand/devices-contract'
import { type Projects, projectsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { Context } from 'drydock'
import type { FolderRepo, GitHubFolder } from '../contract'

interface CopyParts {
  pcs: Pcs
  projects: Projects
  folderRepo(folder: GitHubFolder): FolderRepo | null | undefined
}

export const localCopies = (ctx: Context, { pcs, projects, folderRepo }: CopyParts) => {
  const changes = pulse(ctx, [projectsChange, pcsChange])

  const best = (copies: GitHubFolder[]) => copies.find(folder => pcs.get(folder.device)?.home) ?? copies[0]

  return (repo: string): GitHubFolder | undefined => {
    changes.version.get()
    const wanted = repo.toLowerCase()
    const folders = projects
      .groups({ hidden: true })
      .flatMap(group => group.locations)
      .filter(entry => !entry.missing && pcs.online(entry.device))
      .map(entry => ({ cwd: entry.path, device: entry.device }))
    const matching = (key: keyof FolderRepo) => folders.filter(folder => folderRepo(folder)?.[key]?.toLowerCase() === wanted)
    return best(matching('repo')) ?? best(matching('parent'))
  }
}
