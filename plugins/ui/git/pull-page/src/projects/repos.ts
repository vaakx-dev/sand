import { projectsChange, type ProjectGroup } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { PageContext } from '../inject'

export interface RepoChoice {
  project: string
  name: string
  repo: string
}

const withScheme = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?([^/:]+)(?::\d*)?\/(.+)$/i
const scpLike = /^(?:[^@/]+@)?([^/:]{2,}):(?!\/\/)(.+)$/
const repoName = /^[\w.-]+\/[\w.-]+$/
const githubHosts = new Set(['github.com', 'www.github.com', 'ssh.github.com'])

export const githubRepo = (remote: string | undefined) => {
  const text = remote?.trim()
  if (!text) return undefined
  const match = withScheme.exec(text) ?? scpLike.exec(text)
  const host = match?.[1]?.toLowerCase()
  if (!match?.[2] || !host || !githubHosts.has(host)) return undefined
  const path = match[2].replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/, '')
  return repoName.test(path) ? path : undefined
}

const choiceOf = (group: ProjectGroup): RepoChoice[] => {
  const repo = githubRepo(group.remote)
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
