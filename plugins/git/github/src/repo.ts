import type { GitRunner } from '@sand/git-runner/contract'
import { githubHost } from './api/endpoint'

const repoPattern = new RegExp(`${githubHost.replace('.', '\\.')}[:/]([^/]+)/([^/]+?)(?:\\.git)?/?$`)

const pullPattern = new RegExp(`^(?:https://${githubHost.replace('.', '\\.')}/)?([^/\\s#]+)/([^/\\s#]+?)(?:/pull/|#)(\\d+)(?:[/?#].*)?$`)

export const pullReference = (text: string) => {
  const match = pullPattern.exec(text.trim())
  if (!match) return undefined
  const [, owner, repo, number] = match
  return { path: `/repos/${owner}/${repo}`, number: Number(number) }
}

export const repoOf = async (git: Pick<GitRunner, 'remoteUrl'>, cwd: string) => {
  const remote = await git.remoteUrl(cwd)
  const match = remote && repoPattern.exec(remote)
  if (!match) return undefined
  const [, owner, repo] = match
  return { path: `/repos/${owner}/${repo}`, owner }
}
