import type { PullRef } from '@sand/github/contract'

const pattern = /^([\w.-]+\/[\w.-]+)#(\d+)$/

export const pullKey = ({ repo, number }: PullRef) => `${repo}#${number}`

export const sameKey = (a: PullRef, b: PullRef) => a.repo.toLowerCase() === b.repo.toLowerCase() && a.number === b.number

export const lowerKey = (ref: PullRef) => pullKey(ref).toLowerCase()

export const parseKey = (text: string | undefined): PullRef | undefined => {
  const match = text ? pattern.exec(text) : null
  if (!match?.[1] || !match[2]) return undefined
  return { repo: match[1], number: Number(match[2]) }
}

export const refOf = ({ repo, number }: PullRef): PullRef => ({ repo, number })
