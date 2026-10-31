import type { PullRef } from '@sand/github/contract'

const repoPattern = /^[\w.-]+\/[\w.-]+$/

export const pullKey = ({ repo, number }: PullRef) => `${repo.toLowerCase()}#${number}`

export const pullLabel = ({ repo, number }: PullRef) => `${repo}#${number}`

export const pullVariables = ({ repo, number }: PullRef) => {
  if (!repoPattern.test(repo)) throw new Error(`"${repo}" isn't a GitHub repository name like owner/name.`)
  const [owner = '', name = ''] = repo.split('/')
  return { owner, name, number }
}
