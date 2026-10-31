import type { GitHub, PullSummary } from '@sand/github/contract'

interface Comparison {
  behind_by: number
}

const pathPart = (branch: string) => branch.split('/').map(encodeURIComponent).join('/')

export const behindBase = async (github: GitHub, summary: PullSummary, headOid: string, headExists: boolean) => {
  if (!headExists || (summary.state !== 'open' && summary.state !== 'draft')) return undefined
  const path = `/repos/${summary.repo}/compare/${pathPart(summary.base)}...${headOid}?per_page=1`
  const comparison = await github.rest<Comparison>('GET', path).catch(() => undefined)
  return comparison?.behind_by
}
