import { GitHubError } from '../api/errors'
import type { PullRef } from '../contract'
import { isRepoName } from '../repo/slug'

export const refKey = ({ repo, number }: PullRef) => `${repo.toLowerCase()}#${number}`

export const refLabel = ({ repo, number }: PullRef) => `${repo}#${number}`

export const ownerAndName = (repo: string) => {
  if (!isRepoName(repo)) throw new GitHubError(`"${repo}" isn't a GitHub repository name like owner/name.`)
  const [owner = '', name = ''] = repo.split('/')
  return { owner, name }
}
