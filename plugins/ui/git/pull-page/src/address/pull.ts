import type { PullRef } from '@sand/github/contract'

const pattern = /^([\w.-]+\/[\w.-]+)#(\d+)$/

export const parsePull = (text: string | undefined): PullRef | undefined => {
  const match = text ? pattern.exec(text) : null
  if (!match?.[1] || !match[2]) return undefined
  return { repo: match[1], number: Number(match[2]) }
}
