import { type GitHub, isMissing, type PullSummary } from '@sand/github/contract'

interface Comparison {
  behind_by: number
}

const pathPart = (branch: string) => branch.split('/').map(encodeURIComponent).join('/')

export const behindBase = async (github: GitHub, summary: PullSummary, headOid: string, headExists: boolean) => {
  if (!headExists || (summary.state !== 'open' && summary.state !== 'draft')) return undefined
  const path = `/repos/${summary.repo}/compare/${pathPart(summary.base)}...${headOid}?per_page=1`
  try {
    return (await github.rest<Comparison>('GET', path)).behind_by
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
}
