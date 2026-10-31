import { pcsChange } from '@sand/devices-contract'
import { type ProjectGroup, projectsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { PageContext } from '../inject'

export interface RepoChoice {
  project: string
  name: string
  repos: string[]
}

const choiceOf = (ctx: PageContext, group: ProjectGroup): RepoChoice[] => {
  const repos = new Set<string>()
  for (const entry of group.locations) {
    if (entry.missing || !ctx.pcs.online(entry.device)) continue
    const repo = ctx.github.repoOf({ cwd: entry.path, device: entry.device })
    if (repo) repos.add(repo)
  }
  return repos.size ? [{ project: group.id, name: group.name, repos: [...repos] }] : []
}

export const repoChoices = (ctx: PageContext) =>
  pulse(ctx, [projectsChange, pcsChange])
    .read(() => ctx.projects.groups().flatMap(group => choiceOf(ctx, group)))
    .map(choices => [...choices].sort((a, b) => a.name.localeCompare(b.name)))

export const reposFor = (choices: RepoChoice[], project: string) => (project ? choices.find(choice => choice.project === project)?.repos : undefined)
