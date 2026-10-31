import type { PullRef } from '@sand/github/contract'

const repoName = /^[\w.-]+\/[\w.-]+$/

export const refKey = ({ repo, number }: PullRef) => `${repo.toLowerCase()}#${number}`

export const refLabel = ({ repo, number }: PullRef) => `${repo}#${number}`

export const ownerAndName = (repo: string) => {
  if (!repoName.test(repo)) throw new Error(`"${repo}" isn't a GitHub repository name like owner/name.`)
  const [owner = '', name = ''] = repo.split('/')
  return { owner, name }
}

export const pullVariables = ({ repo, number }: PullRef) => ({ ...ownerAndName(repo), number })
