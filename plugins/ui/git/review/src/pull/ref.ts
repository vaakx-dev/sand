import type { PullRef } from '@sand/github/contract'

export const sameRef = (a: PullRef, b: PullRef) => a.number === b.number && a.repo.toLowerCase() === b.repo.toLowerCase()

export const refLabel = ({ repo, number }: PullRef) => `${repo}#${number}`

export const pullName = ({ number }: PullRef) => `#${number}`

export const shortSha = (sha: string) => sha.slice(0, 7)
