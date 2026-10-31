import { repoSlug } from '@sand/github/contract'
import { projectsChange, type ProjectGroup } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { PageContext } from '../inject'

export interface RepoChoice {
  project: string
  name: string
  repo: string
}

const choiceOf = (group: ProjectGroup): RepoChoice[] => {
  const repo = repoSlug(group.remote)
  return repo ? [{ project: group.id, name: group.name, repo }] : []
}

export const repoChoices = (ctx: PageContext) =>
  pulse(ctx, [projectsChange])
    .read(() => ctx.projects.groups().flatMap(choiceOf))
    .map(choices => [...choices].sort((a, b) => a.name.localeCompare(b.name)))

export const reposFor = (choices: RepoChoice[], project: string) => {
  if (!project) return undefined
  const repos = [...new Set(choices.filter(choice => choice.project === project).map(choice => choice.repo))]
  return repos.length ? repos : undefined
}
