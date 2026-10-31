import { GitHubError } from '../api/errors'
import type { PullRef } from '../contract'
import { isRepoName } from '../repo/slug'

export const pullKey = ({ repo, number }: PullRef) => `${repo.toLowerCase()}#${number}`

export const samePull = (a: PullRef, b: PullRef) => pullKey(a) === pullKey(b)

export const pullLabel = ({ repo, number }: PullRef) => `${repo}#${number}`

export const pullVariables = ({ repo, number }: PullRef) => {
  if (!isRepoName(repo)) throw new GitHubError(`"${repo}" isn't a GitHub repository name like owner/name.`)
  const [owner = '', name = ''] = repo.split('/')
  return { owner, name, number }
}
