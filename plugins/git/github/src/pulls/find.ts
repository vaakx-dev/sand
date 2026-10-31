import type { Client } from '../api/client'
import type { PullRef } from '../contract'
import type { BranchPlace } from '../repo/place'

interface ListedPull {
  number: number
  state: 'open' | 'closed'
  updated_at: string
}

interface Found extends PullRef {
  open: boolean
  updated: number
}

const listPath = (repo: string, head: string) => `/repos/${repo}/pulls?state=all&head=${encodeURIComponent(head)}&sort=updated&direction=desc&per_page=10`

const distinct = (repos: string[]) => [...new Map(repos.map(repo => [repo.toLowerCase(), repo])).values()]

const better = (a: Found, b: Found) => Number(b.open) - Number(a.open) || b.updated - a.updated

export const findBranchPull = async (client: Client, place: BranchPlace): Promise<PullRef | undefined> => {
  const head = `${place.head.repo.split('/')[0]}:${place.head.branch}`
  const lists = await Promise.all(
    distinct([place.base, place.head.repo]).map(async repo => {
      const pulls = await client.rest<ListedPull[]>('GET', listPath(repo, head))
      return pulls.map((pull): Found => ({ repo, number: pull.number, open: pull.state === 'open', updated: Date.parse(pull.updated_at) }))
    }),
  )
  const best = lists.flat().sort(better)[0]
  return best ? { repo: best.repo, number: best.number } : undefined
}
