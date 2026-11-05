import type { ContextRecord } from '@sand/chats/contract'
import type { PullState, PullSummary } from '@sand/github/contract'
import { uuid } from '@sand/util'

export type PullSnapshot = Pick<PullSummary, 'repo' | 'number' | 'title' | 'url' | 'state'>

export const pullKind = 'pull'

export const pullRecord = ({ repo, number, title, url, state }: PullSnapshot): ContextRecord => ({
  v: 1,
  id: uuid(),
  kind: pullKind,
  label: `#${number}`,
  data: { repo, number, title, url, state },
})

const states: PullState[] = ['open', 'draft', 'merged', 'closed']

const isState = (value: unknown): value is PullState => states.some(state => state === value)

export const pullOf = ({ data: { repo, number, title, url, state } }: ContextRecord): PullSnapshot | undefined => {
  if (typeof repo !== 'string' || typeof number !== 'number' || typeof title !== 'string' || typeof url !== 'string' || !isState(state)) return undefined
  return { repo, number, title, url, state }
}
